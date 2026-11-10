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
		// Strip colors and the backticks some terminals get, so CI and local runs compare the same text.
		const output = readFileSync(path, 'utf8')
			.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g'), '')
			.replaceAll('`', '');
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

test('quiet aliases suppress stdout and leave default database stderr empty', async () => {
	const dir = mkdtempSync(join(process.cwd(), '.quiet-test-'));
	const quietEnv: NodeJS.ProcessEnv = {
		...env,
		HOME: dir,
		USERPROFILE: dir,
		EMAIL_CONFIG_DIR: join(dir, 'config'),
	};
	for (const key of Object.keys(quietEnv)) {
		if (key.startsWith('EMAIL_') && key !== 'EMAIL_CONFIG_DIR') delete quietEnv[key];
	}
	delete quietEnv.GHOSTPAW_EMAIL_DB;
	try {
		const run = async (command: string[]) => {
			const outPath = join(dir, 'stdout');
			const errPath = join(dir, 'stderr');
			const outFd = openSync(outPath, 'w');
			const errFd = openSync(errPath, 'w');
			try {
				const child = spawn(process.execPath, [...args, ...command], {
					env: quietEnv,
					stdio: ['ignore', outFd, errFd],
				});
				const [code] = await once(child, 'close');
				const stdout = readFileSync(outPath, 'utf8');
				const stderr = readFileSync(errPath, 'utf8');
				assert.equal(code, 0, stderr);
				return { stdout, stderr };
			} finally {
				closeSync(outFd);
				closeSync(errFd);
			}
		};
		assert.notEqual((await run(['mail', 'read', '--view', 'folders'])).stdout, '');
		for (const first of [true, false]) {
			const command = ['mail', 'read', '--view', 'folders'];
			const flags = (flag: string) => (first ? [flag, ...command] : [...command, flag]);
			const long = await run(flags('--quiet'));
			assert.deepEqual(long, { stdout: '', stderr: '' });
			assert.deepEqual(await run(flags('-q')), long);
		}
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('command help lists both quiet aliases', async () => {
	for (const command of [['read'], ['search'], ['sync'], ['organize'], ['compose', 'send']]) {
		assert.match(await help(...command), /-q, --quiet/);
	}
});
