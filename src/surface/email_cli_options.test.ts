import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { test } from 'node:test';
import { runToolCli } from '../surfaces/cli.ts';
import { cliCommands } from '../surfaces/cli_commands.ts';
import { emailCliOptions } from './email_cli_options.ts';
import { emailMcpTools, emailSurfaceTools } from './email_surface_tools.ts';

test('email noun-verb search and folders work offline with a fresh file cache', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'email-cli-'));
	try {
		for (const args of [
			['mail', 'search', 'invoice'],
			['mail', 'read', '--view', 'folders'],
		]) {
			let out = '';
			let err = '';
			const code = await runToolCli([...args, '--db', join(dir, 'email.db'), '--json'], {
				...emailCliOptions,
				stdin: Readable.from([]),
				stdout: new Writable({
					write(chunk, _encoding, cb) {
						out += String(chunk);
						cb();
					},
				}),
				stderr: new Writable({
					write(chunk, _encoding, cb) {
						err += String(chunk);
						cb();
					},
				}),
			});
			assert.equal(code, 0, err);
			assert.equal(err, '');
			assert.equal(JSON.parse(out).ok, true);
		}
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('email command paths are unique and cover every tool action once', () => {
	const commands = cliCommands(emailSurfaceTools);
	assert.equal(commands.length, 33);
	assert.equal(new Set(commands.map((c) => c.path)).size, commands.length);
	for (const tool of emailMcpTools) {
		assert.equal('cli' in tool, false);
		const entries = commands.filter((c) => c.tool.name === tool.name);
		const actions = tool.inputSchema.properties?.action?.enum;
		if (actions)
			assert.deepEqual(
				entries.map((c) => c.fixed.action),
				actions,
			);
		else assert.equal(entries.length, 1);
	}
	assert.ok(commands.some((c) => c.path === 'mail draft' && c.fixed.action === 'save_draft'));
});
