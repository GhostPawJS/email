import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { upsertAccount } from './upsert_account.ts';
import { upsertFolder } from './upsert_folder.ts';

describe('upsertFolder', () => {
	it('inserts and updates on conflict', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f1 = upsertFolder(db, { accountId: a.id, path: 'INBOX', role: 'inbox' });
		assert.equal(f1.path, 'INBOX');
		const f2 = upsertFolder(db, {
			accountId: a.id,
			path: 'INBOX',
			role: 'inbox',
			messageCount: 5,
		});
		assert.equal(f2.id, f1.id);
		assert.equal(f2.messageCount, 5);
		db.close();
	});
});
