import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const entry = new URL('../cli.ts', import.meta.url).pathname;
const env = { ...process.env };
delete env.NODE_TEST_CONTEXT;
const args = ['--no-warnings', '--experimental-strip-types', entry];

test('CLI exits quietly when stdout is closed early', async () => {
	const child = spawn(process.execPath, [...args, 'tools', '--json'], { env });
	let stderr = '';
	child.stderr.on('data', (chunk) => {
		stderr += String(chunk);
	});
	const closed = once(child, 'close');
	child.stdout.destroy();
	const [code] = await closed;
	assert.equal(code, 0, stderr);
	assert.equal(stderr, '');
});

async function help(...command: string[]): Promise<string> {
	const dir = mkdtempSync(join(tmpdir(), 'cli-help-'));
	const path = join(dir, 'output');
	const fd = openSync(path, 'w');
	try {
		const child = spawn(process.execPath, [...args, ...command, '--help'], {
			env,
			stdio: ['ignore', fd, fd],
		});
		const [code] = await once(child, 'close');
		const output = readFileSync(path, 'utf8');
		assert.equal(code, 0, output);
		return output;
	} finally {
		closeSync(fd);
		rmSync(dir, { recursive: true, force: true });
	}
}

test('top-level help uses the installed ghostpaw-email command', async () => {
	const output = await help();
	assert.match(output, /USAGE\s+ghostpaw-email/);
	assert.match(output, /ghostpaw-email v/);
});

test('account add help describes negated TLS flags', async () => {
	const output = await help('account', 'add');
	for (const protocol of ['imap', 'smtp']) {
		assert.ok(output.includes(`--no-${protocol}-tls`));
		assert.ok(output.includes(`Disable TLS for ${protocol.toUpperCase()} (TLS is on by default)`));
	}
});
