import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { cliVersion } from './cli_version.ts';
import { emailVersion } from './version.ts';

test('human version distinguishes binary, npm and library', () => {
	assert.equal(
		cliVersion('1.2.3', { isSea: () => true, platform: 'linux', arch: 'x64' }),
		'email 1.2.3 (binary, linux-x64)',
	);
	assert.equal(
		cliVersion('1.2.3', { isSea: () => true, npm: true, platform: 'win32', arch: 'x64' }),
		'email 1.2.3 (binary, windows-x64)',
	);
	assert.equal(cliVersion('1.2.3', { isSea: () => false, npm: true }), 'email 1.2.3 (npm)');
	assert.equal(cliVersion('1.2.3', { isSea: () => false, npm: false }), 'email 1.2.3 (library)');
	assert.equal(
		cliVersion('1.2.3', {
			isSea: () => {
				throw new Error('unavailable');
			},
			npm: false,
		}),
		'email 1.2.3 (library)',
	);
});

test('structured version includes the host target for every variant', () => {
	for (const [binary, npm, variant] of [
		[true, true, 'binary'],
		[false, true, 'npm'],
		[false, false, 'library'],
	] as const) {
		assert.deepEqual(
			JSON.parse(
				cliVersion('1.2.3', {
					isSea: () => binary,
					npm,
					platform: 'win32',
					arch: 'x64',
					args: ['--json', '--short'],
				}),
			),
			{ name: 'email', version: '1.2.3', variant, target: 'windows-x64' },
		);
	}
});

test('CLI entry supports version forms in every flag order', () => {
	const permutations = (args: string[]): string[][] =>
		args.length === 0
			? [[]]
			: args.flatMap((arg, index) =>
					permutations(args.filter((_, i) => i !== index)).map((rest) => [arg, ...rest]),
				);
	const dir = mkdtempSync(join(tmpdir(), 'email-version-'));
	try {
		for (const flag of ['--version', '-V', '-v']) {
			for (const modifiers of [[], ['--short'], ['--json'], ['--short', '--json']]) {
				for (const args of permutations([flag, ...modifiers])) {
					const paths = ['stdout', 'stderr'].map((name) => join(dir, name));
					const fds = paths.map((path) => openSync(path, 'w'));
					let result: ReturnType<typeof spawnSync>;
					try {
						result = spawnSync(
							process.execPath,
							['--no-warnings', '--experimental-strip-types', 'src/cli.ts', ...args],
							{ stdio: ['ignore', ...fds], timeout: 15000 },
						);
					} finally {
						for (const fd of fds) closeSync(fd);
					}
					const stdout = readFileSync(paths[0] as string, 'utf8');
					const stderr = readFileSync(paths[1] as string, 'utf8');
					assert.equal(result.status, 0, `${args}: ${stderr}`);
					assert.equal(stderr, '');
					const expected = modifiers.includes('--json')
						? JSON.stringify({
								name: 'email',
								version: emailVersion,
								variant: 'npm',
								target: `${process.platform === 'win32' ? 'windows' : process.platform}-${process.arch}`,
							})
						: modifiers.includes('--short')
							? emailVersion
							: `email ${emailVersion} (npm)`;
					assert.equal(stdout, `${expected}\n`, args.join(' '));
				}
			}
		}
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
