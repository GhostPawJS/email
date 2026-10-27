import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cliVersion } from './cli_version.ts';

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
