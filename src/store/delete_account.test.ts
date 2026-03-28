import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { deleteAccount } from './delete_account.ts';
import { getAccount } from './get_account.ts';
import { upsertAccount } from './upsert_account.ts';

describe('deleteAccount', () => {
	it('cascades to folders', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		db.prepare("INSERT INTO folders (account_id, path) VALUES (?, 'INBOX')").run(a.id);
		deleteAccount(db, a.id);
		assert.equal(getAccount(db, a.id), undefined);
		db.close();
	});
});
