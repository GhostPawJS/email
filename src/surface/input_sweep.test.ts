import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { test } from 'node:test';
import { runToolCli } from '../surfaces/cli.ts';
import { createMcpServer } from '../surfaces/mcp_server.ts';
import { emailTools } from '../tools/aligned.ts';
import { emailTools as legacyTools } from '../tools/email_tools.ts';
import type { EmailToolContext } from '../tools/tool_metadata.ts';
import { emailCliOptions } from './email_cli_options.ts';
import { emailMcpOptions } from './email_mcp_options.ts';
import { openEmailDb } from './open_email_db.ts';

const forbidden = /system_error|internal_error|Cannot read properties of undefined/i;

test('malformed input sweep: every tool and action through CLI, MCP and exported facades', async () => {
	const db = await openEmailDb(':memory:');
	const unavailable = new Proxy(
		{},
		{
			get: () => () => {
				throw new Error('not_found');
			},
		},
	);
	const ctx = {
		read: unavailable,
		write: unavailable,
		network: unavailable,
	} as unknown as EmailToolContext;
	const server = createMcpServer(emailMcpOptions(() => db));
	await server.handleMessage({
		jsonrpc: '2.0',
		id: 0,
		method: 'initialize',
		params: {
			protocolVersion: '2025-11-25',
			capabilities: {},
			clientInfo: { name: 'test', version: '1' },
		},
	});
	try {
		for (const tool of emailTools) {
			const cases: Record<string, unknown>[] = [{}];
			const key = tool.inputSchema.properties?.action ? 'action' : 'view';
			for (const action of tool.inputSchema.properties?.[key]?.enum ?? []) {
				cases.push({ [key]: action });
				for (const [name, schema] of Object.entries(tool.inputSchema.properties ?? {}))
					if (schema.type === 'object') cases.push({ [key]: action, [name]: {} });
			}
			if (tool.name === 'mail_compose')
				cases.push(
					{ action: 'send', input: { to: [{}], subject: 'Hello' } },
					{
						action: 'send',
						input: { to: [{ address: 'reader@example.com' }], subject: 'Hello', from: {} },
					},
					{
						action: 'send',
						input: { to: [{ address: 'reader@example.com' }], subject: 'Hello', attachments: [{}] },
					},
				);
			for (const input of cases) {
				const label = `${tool.name} ${JSON.stringify(input)}`;
				for (const facade of [tool, legacyTools.find((entry) => entry.name === tool.name)]) {
					assert.ok(facade);
					const result = await facade.handler(ctx, input as never);
					assert.doesNotMatch(JSON.stringify(result), forbidden, label);
					if (result.summary.includes('; pass ')) {
						const hints = 'next' in result ? result.next : result.nextSteps;
						assert.ok(hints.length, label);
					}
				}
				let output = '';
				const stream = new Writable({
					write(chunk, _encoding, done) {
						output += String(chunk);
						done();
					},
				});
				const code = await runToolCli(['call', tool.name, JSON.stringify(input)], {
					...emailCliOptions,
					openContext: () => db,
					closeContext: () => {},
					stdin: Readable.from([]),
					stdout: stream,
					stderr: stream,
				});
				assert.notEqual(code, 70, label);
				assert.doesNotMatch(output, forbidden, label);
				if (/required|expected/.test(output)) assert.match(output, /; pass \{/, label);
				const response = await server.handleMessage({
					jsonrpc: '2.0',
					id: 1,
					method: 'tools/call',
					params: { name: tool.name, arguments: input },
				});
				const text = JSON.stringify(response);
				assert.doesNotMatch(text, forbidden, label);
				if (/required|expected/.test(text)) assert.match(text, /; pass /, label);
			}
		}
	} finally {
		db.close();
	}
});
