import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { getAccount } from './get_account.ts';
import { upsertAccount } from './upsert_account.ts';

describe('getAccount', () => {
	it('returns undefined when missing', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		assert.equal(getAccount(db, 999), undefined);
		db.close();
	});

	it('returns account by id', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		assert.equal(getAccount(db, a.id)?.username, 'u');
		db.close();
	});
});
