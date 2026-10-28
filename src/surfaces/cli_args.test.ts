import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { CliUsageError, parseCliArgs, renderCliHelp } from './cli_args.ts';

test('generic parser supports flags, aliases, arrays, files and positionals', () => {
	const dir = mkdtempSync(join(tmpdir(), 'cli-args-'));
	try {
		writeFileSync(join(dir, 'value'), '{"x":1}');
		assert.deepEqual(
			parseCliArgs(
				[
					'--min-score=2.5',
					'--no-enabled',
					'--tag',
					'a',
					'--tag=b',
					'-c',
					`@${join(dir, 'value')}`,
					'--',
					'-literal',
				],
				{
					command: 'test',
					flags: [
						{ name: 'min-score', type: 'number' },
						{ name: 'enabled', type: 'boolean' },
						{ name: 'tag', type: 'array' },
						{ name: 'config', short: 'c', type: 'json', file: true },
					],
					positionals: [{ name: 'query', type: 'string' }],
				},
			),
			{ minScore: 2.5, enabled: false, tag: ['a', 'b'], config: { x: 1 }, query: '-literal' },
		);
	} finally {
		rmSync(dir, { recursive: true });
	}
});
test('generic parser reports typed usage errors and renders schema help', () => {
	const spec = {
		command: 'test',
		flags: [{ name: 'limit', type: 'integer' as const, required: true, enum: [1, 2] }],
	};
	for (const args of [
		[],
		['--limit'],
		['--limit', 'no'],
		['--limit=1.5'],
		['--limit=3'],
		['--limti=1'],
	])
		assert.throws(() => parseCliArgs(args, spec), CliUsageError);
	assert.match(renderCliHelp(spec), /integer \(1\|2\) required/);
	assert.deepEqual(
		parseCliArgs(['1', '2'], {
			command: 'merge',
			positionals: [{ name: 'ids', type: 'integer', variadic: true }],
		}),
		{ ids: [1, 2] },
	);
});

test('flag values accept double hyphens and front matter but reject following named flags', () => {
	const spec = { command: 'test', flags: [{ name: 'body', type: 'string' as const }] };
	for (const body of ['--', '---', '---\ntitle: Draft\n---', '--123']) {
		assert.deepEqual(parseCliArgs(['--body', body], spec), { body });
	}
	for (const flag of ['--body', '--Body']) {
		assert.throws(() => parseCliArgs(['--body', flag], spec), /Missing value: --body/);
	}
});

test('a leading @ reads a file only for file-capable arguments, and @@ escapes it', () => {
	const dir = mkdtempSync(join(tmpdir(), 'cli-args-'));
	try {
		const path = join(dir, 'body.md');
		writeFileSync(path, '# body\n');
		const spec = {
			command: 'example',
			flags: [
				{ name: 'body', type: 'string' as const, file: true },
				{ name: 'title', type: 'string' as const },
			],
			positionals: [{ name: 'text', type: 'string' as const }],
		};
		assert.deepEqual(parseCliArgs(['--body', `@${path}`], spec), { body: '# body\n' });
		assert.deepEqual(parseCliArgs(['--body', '@@fox said hi'], spec), { body: '@fox said hi' });
		assert.deepEqual(parseCliArgs(['--body', 'a@b'], spec), { body: 'a@b' });
		assert.deepEqual(parseCliArgs(['--title', `@${path}`], spec), { title: `@${path}` });
		assert.deepEqual(parseCliArgs(['--title', '@@x'], spec), { title: '@@x' });
		assert.deepEqual(parseCliArgs(['@fox said hi'], spec), { text: '@fox said hi' });
		assert.throws(() => parseCliArgs(['--body', '@'], spec), /Empty file path for body/);
		assert.throws(
			() => parseCliArgs(['--body', `@${join(dir, 'missing')}`], spec),
			(error: unknown) =>
				error instanceof CliUsageError && /use @@ for a literal leading @/.test(error.message),
		);
		assert.match(renderCliHelp(spec), /--body {2}string \(@file, @- stdin, @@ literal @\)/);
	} finally {
		rmSync(dir, { recursive: true });
	}
});
