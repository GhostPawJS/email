import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createEmailMcpServer } from '../mcp.ts';
import { insertMessage, upsertAccount, upsertFolder } from '../store/index.ts';
import { emailTools } from '../tools/aligned.ts';
import { emailMcpOptions } from './email_mcp_options.ts';
import { emailSurfaceTools } from './email_surface_tools.ts';
import { openEmailDb } from './open_email_db.ts';

test('discovery and tool listing never open a database or require an account', async () => {
	const server = createEmailMcpServer({ dbPath: '/unwritable/discovery/email.db' });
	const initialized = JSON.parse(
		(await server.handleLine(
			JSON.stringify({
				jsonrpc: '2.0',
				id: 1,
				method: 'initialize',
				params: {
					protocolVersion: '2025-11-25',
					capabilities: {},
					clientInfo: { name: 'test', version: '1' },
				},
			}),
		)) ?? 'null',
	);
	assert.equal(initialized.result.serverInfo.name, 'ghostpaw-email');
	const listed = JSON.parse(
		(await server.handleLine(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }))) ??
			'null',
	);
	assert.deepEqual(
		listed.result.tools.map((tool: { name: string }) => tool.name),
		emailTools.map((tool) => tool.name),
	);
});

test('cached folders and search work offline through the aligned handlers', async () => {
	const db = await openEmailDb(':memory:');
	try {
		const account = upsertAccount(db, { host: 'example.com', port: 993, username: 'reader' });
		const folder = upsertFolder(db, { accountId: account.id, path: 'INBOX' });
		insertMessage(db, {
			folderId: folder.id,
			uid: 42,
			messageId: '<tea@example.com>',
			inReplyTo: null,
			references: [],
			threadId: null,
			subject: 'Jasmine tea',
			from: null,
			to: [],
			cc: [],
			bcc: [],
			replyTo: null,
			date: null,
			receivedAt: '2026-01-01',
			envelopeFrom: null,
			envelopeTo: [],
			flags: [],
			labels: [],
			size: null,
			bodyStructure: null,
			hasAttachments: false,
			modSeq: null,
		});
		const search = emailSurfaceTools.find((tool) => tool.name === 'mail_search');
		assert.ok(search);
		assert.deepEqual(
			await search.handler(db, { query: 'jasmine' }),
			await emailTools
				.find((tool) => tool.name === 'mail_search')
				?.handler(
					{ read: (await import('../read.ts')).createReadSurface(db, account.id) } as never,
					{ query: 'jasmine' },
				),
		);
		const result = (await search.handler(db, { query: 'jasmine' })) as {
			ok: boolean;
			data: { entities: { id: string }[] };
		};
		assert.equal(result.ok, true);
		assert.equal(result.data.entities[0]?.id, '42');
	} finally {
		db.close();
	}
});

test('network tools return actionable account errors without crashing', async () => {
	const directory = mkdtempSync(join(tmpdir(), 'email-surface-config-'));
	const keys = [
		'EMAIL_CONFIG_DIR',
		'EMAIL_ACCOUNT',
		'EMAIL_IMAP_HOST',
		'EMAIL_SMTP_HOST',
		'EMAIL_USER',
		'EMAIL_PASS',
		'EMAIL_ACCESS_TOKEN',
	];
	const saved = keys.map((key) => process.env[key]);
	const db = await openEmailDb(':memory:');
	try {
		for (const key of keys) delete process.env[key];
		process.env.EMAIL_CONFIG_DIR = directory;
		const tool = emailSurfaceTools.find((tool) => tool.name === 'mail_sync');
		assert.ok(tool);
		const result = (await tool.handler(db, { action: 'connect' })) as {
			ok: boolean;
			summary: string;
			next: { message: string }[];
		};
		assert.equal(result.ok, false);
		assert.match(result.summary, /No accounts configured/);
		assert.match(result.next[0]?.message ?? '', /email account add/);
	} finally {
		db.close();
		keys.forEach((key, i) => {
			const value = saved[i];
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		});
		rmSync(directory, { recursive: true, force: true });
	}
});

test('annotations conservatively describe every mixed-operation tool', () => {
	const options = emailMcpOptions(() => {
		throw new Error('unused');
	});
	for (const tool of emailSurfaceTools) {
		assert.deepEqual(options.annotations?.(tool), {
			readOnlyHint: false,
			destructiveHint: ['mail_organize', 'mail_compose'].includes(tool.name),
			idempotentHint: false,
			openWorldHint: true,
		});
	}
});
