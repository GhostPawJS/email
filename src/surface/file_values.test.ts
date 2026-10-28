import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runToolCli } from '../surfaces/cli.ts';
import { emailCliOptions } from './email_cli_options.ts';

const cliEntry = fileURLToPath(new URL('../cli.ts', import.meta.url));

async function surface(args: string[]) {
	let out = '';
	let err = '';
	const sink = (write: (text: string) => void) =>
		new Writable({
			write(chunk, _encoding, done) {
				write(String(chunk));
				done();
			},
		});
	const code = await runToolCli(args, {
		...emailCliOptions,
		stdin: Readable.from([]),
		stdout: sink((text) => {
			out += text;
		}),
		stderr: sink((text) => {
			err += text;
		}),
	});
	return { code, out, err };
}

test('mail compose --input is the only file-capable surface flag', async () => {
	const help = await surface(['mail', 'send', '--help']);
	assert.match(help.out, /--input {2}json.*\(@file, @- stdin, @@ literal @\)/);
	const search = await surface(['mail', 'search', '--help']);
	assert.doesNotMatch(search.out, /@file, @- stdin/);
	const empty = await surface(['mail', 'send', '--input', '@']);
	assert.equal(empty.code, 2);
	assert.match(empty.err, /Empty file path for input; use @@ for a literal leading @/);
	const missing = await surface(['mail', 'send', '--input', '@/nonexistent/x.json']);
	assert.equal(missing.code, 2);
	assert.match(missing.err, /Cannot read value file for input: \/nonexistent\/x\.json \(use @@/);
	assert.doesNotMatch(missing.err, /ENOENT/);
});

test('compose --body reads @file before any account lookup; errors exit 2', () => {
	const home = mkdtempSync(join(tmpdir(), 'email-file-values-'));
	try {
		const run = (...args: string[]) =>
			spawnSync(process.execPath, ['--experimental-strip-types', cliEntry, ...args], {
				encoding: 'utf8',
				env: { ...process.env, HOME: home, XDG_CONFIG_HOME: join(home, '.config') },
			});
		const base = ['compose', 'send', '--to', 'reader@example.com', '--subject', 's'];
		const empty = run(...base, '--body', '@');
		assert.equal(empty.status, 2, empty.stderr);
		assert.match(empty.stderr + empty.stdout, /Empty file path for body/);
		const missing = run(...base, '--body', '@/nonexistent/body.txt');
		assert.equal(missing.status, 2);
		assert.match(
			missing.stderr + missing.stdout,
			/Cannot read value file for body: \/nonexistent\/body\.txt/,
		);
		const directory = run(...base, '--body', `@${home}`);
		assert.equal(directory.status, 2);
		assert.doesNotMatch(directory.stderr + directory.stdout, /EISDIR/);
		const help = run('compose', 'send', '--help');
		assert.match(help.stdout, /\(@file, @- stdin, @@ literal @\)/);
		const forward = run('compose', 'forward', '--help');
		assert.doesNotMatch(forward.stdout, /@file, @- stdin/);
	} finally {
		rmSync(home, { recursive: true, force: true });
	}
});
