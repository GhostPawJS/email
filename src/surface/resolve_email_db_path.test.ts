import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { resolveEmailDbPath } from './resolve_email_db_path.ts';

test('database path precedence is flag, environment, home default', () => {
	assert.equal(
		resolveEmailDbPath({ flag: ':memory:', env: { GHOSTPAW_EMAIL_DB: 'env' } }),
		':memory:',
	);
	assert.equal(resolveEmailDbPath({ env: { GHOSTPAW_EMAIL_DB: 'env' } }), 'env');
	assert.equal(resolveEmailDbPath({ env: {} }), join(homedir(), '.ghostpaw', 'email.db'));
});

test('empty environment path uses the default', () => {
	assert.equal(
		resolveEmailDbPath({ env: { GHOSTPAW_EMAIL_DB: '' } }),
		resolveEmailDbPath({ env: {} }),
	);
});
