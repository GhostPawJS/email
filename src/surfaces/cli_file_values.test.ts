import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { test } from 'node:test';
import { runToolCli } from './cli.ts';
import { readFileValue } from './cli_args.ts';
import type { SurfaceTool } from './surface_types.ts';

const echo: SurfaceTool<null> = {
	name: 'note_write',
	description: 'Write a note.',
	inputSchema: {
		type: 'object',
		properties: {
			title: { type: 'string' },
			body: { type: 'string' },
			message: { type: 'string' },
			rationale: { type: 'string' },
		},
	},
	cli: { noun: 'note', verb: 'write', positionals: ['title'], fileArgs: ['body'] },
	handler: (_ctx, input) => ({ ok: true, outcome: 'success', summary: 'ok', data: { input } }),
};

async function run(args: string[]) {
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
		bin: 'example',
		version: '0.0.0',
		description: 'example',
		tools: [echo],
		openContext: () => null,
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

test('CLI values are literal unless the argument is file-capable', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'cli-file-values-'));
	try {
		const file = join(dir, 'body.md');
		writeFileSync(file, 'body from file\n');
		const literal = await run([
			'note',
			'write',
			'@/etc/passwd',
			'--message',
			'@/etc/passwd',
			'--rationale',
			'@@kept',
			'--body',
			`@${file}`,
			'--json',
		]);
		assert.equal(literal.code, 0, literal.err);
		const input = JSON.stringify(JSON.parse(literal.out));
		assert.ok(input.includes('"title":"@/etc/passwd"'), input);
		assert.ok(input.includes('"message":"@/etc/passwd"'), input);
		assert.ok(input.includes('"rationale":"@@kept"'), input);
		assert.ok(input.includes('"body":"body from file\\n"'), input);
		assert.ok(!input.includes('root:'), 'never reads /etc/passwd');
		const escaped = await run(['note', 'write', 't', '--body', '@@fox', '--json']);
		assert.ok(JSON.stringify(JSON.parse(escaped.out)).includes('"body":"@fox"'));
		const empty = await run(['note', 'write', 't', '--body', '@']);
		assert.equal(empty.code, 2);
		assert.match(empty.err, /Empty file path for body; use @@ for a literal leading @/);
		const missing = await run(['note', 'write', 't', '--body', `@${join(dir, 'missing')}`]);
		assert.equal(missing.code, 2);
		assert.match(
			missing.err,
			/Cannot read value file for body: .*missing \(use @@ for a literal leading @\)/,
		);
		assert.doesNotMatch(missing.err, /ENOENT/);
		const directory = await run(['note', 'write', 't', '--body', `@${dir}`]);
		assert.equal(directory.code, 2);
		assert.doesNotMatch(directory.err, /EISDIR/);
		const help = await run(['note', 'write', '--help']);
		assert.match(help.out, /--body {2}string \(@file, @- stdin, @@ literal @\)/);
		assert.doesNotMatch(help.out, /--message {2}string \(@file/);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('file-capable values read stdin with @- and strip one @ from @@', () => {
	assert.equal(readFileValue('@@@x', 'body'), '@@x');
	assert.equal(readFileValue('plain@x', 'body'), 'plain@x');
	const url = new URL('./cli_args.ts', import.meta.url).href;
	const child = spawnSync(
		process.execPath,
		[
			'--input-type=module',
			'-e',
			`import { readFileValue } from ${JSON.stringify(url)}; process.stdout.write(readFileValue('@-', 'body'));`,
		],
		{ input: 'piped body', encoding: 'utf8' },
	);
	assert.equal(child.status, 0, child.stderr);
	assert.equal(child.stdout, 'piped body');
});
