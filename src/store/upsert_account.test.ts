import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { upsertAccount } from './upsert_account.ts';

describe('upsertAccount', () => {
	it('inserts and replaces by id', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a1 = upsertAccount(db, {
			host: 'h',
			port: 993,
			username: 'u',
		});
		assert.ok(a1.id > 0);
		const a2 = upsertAccount(db, {
			id: a1.id,
			host: 'h2',
			port: 993,
			username: 'u',
		});
		assert.equal(a2.id, a1.id);
		assert.equal(a2.host, 'h2');
		db.close();
	});
});
