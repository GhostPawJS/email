import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { listFolders } from './list_folders.ts';
import { upsertAccount } from './upsert_account.ts';
import { upsertFolder } from './upsert_folder.ts';

describe('listFolders', () => {
	it('lists folders for account', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		upsertFolder(db, { accountId: a.id, path: 'INBOX' });
		assert.equal(listFolders(db, a.id).length, 1);
		db.close();
	});
});
