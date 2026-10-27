import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

test('installer targets reject mismatches and allow Rosetta before downloading', () => {
	const dir = mkdtempSync(join(tmpdir(), 'email-installer-'));
	try {
		for (const [name, body] of Object.entries({
			uname: 'case "$1" in -s) echo "$TEST_OS" ;; -m) echo "$TEST_ARCH" ;; esac',
			curl: 'exit 1',
		})) {
			writeFileSync(join(dir, name), `#!/bin/sh\n${body}\n`);
			chmodSync(join(dir, name), 0o755);
		}
		const run = (os: string, arch: string, args: string[]) =>
			spawnSync('sh', ['install.sh', '--version', '0.5.5', ...args], {
				encoding: 'utf8',
				env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, TEST_OS: os, TEST_ARCH: arch },
			});
		const unknown = run('Linux', 'x86_64', ['--target', 'invalid']);
		assert.notEqual(unknown.status, 0);
		assert.match(unknown.stderr, /linux-x64, linux-arm64, darwin-arm64, darwin-x64/);
		const mismatch = run('Linux', 'x86_64', ['--target', 'linux-arm64']);
		assert.match(mismatch.stderr, /this machine is linux-x64; use the linux-x64 install line/);
		for (const [os, arch, target] of [
			['Linux', 'x86_64', 'linux-x64'],
			['Linux', 'aarch64', 'linux-arm64'],
			['Darwin', 'arm64', 'darwin-arm64'],
			['Darwin', 'x86_64', 'darwin-x64'],
			['Darwin', 'arm64', 'darwin-x64'],
		]) {
			const result = run(os ?? '', arch ?? '', ['--target', target ?? '']);
			assert.match(result.stderr, new RegExp(`Downloading ghostpaw-email-0.5.5-${target}.tar.gz`));
		}
		assert.match(
			run('Linux', 'x86_64', []).stderr,
			/Downloading ghostpaw-email-0.5.5-linux-x64.tar.gz/,
		);
		assert.match(run('Linux', 'x86_64', ['-h']).stdout, /--target linux-x64/);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
