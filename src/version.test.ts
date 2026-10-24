import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { emailVersion } from './version.ts';

test('version matches package.json', () => {
	assert.equal(
		emailVersion,
		JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version,
	);
});
