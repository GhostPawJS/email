import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { listAccounts } from './list_accounts.ts';
import { upsertAccount } from './upsert_account.ts';

describe('listAccounts', () => {
	it('lists all accounts', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		upsertAccount(db, { host: 'h', port: 993, username: 'a' });
		upsertAccount(db, { host: 'h', port: 993, username: 'b' });
		assert.equal(listAccounts(db).length, 2);
		db.close();
	});
});
