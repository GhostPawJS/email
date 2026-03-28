import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { deleteFolder } from './delete_folder.ts';
import { getFolderById } from './get_folder_by_id.ts';
import { upsertAccount } from './upsert_account.ts';
import { upsertFolder } from './upsert_folder.ts';

describe('deleteFolder', () => {
	it('removes folder', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f = upsertFolder(db, { accountId: a.id, path: 'X' });
		deleteFolder(db, f.id);
		assert.equal(getFolderById(db, f.id), undefined);
		db.close();
	});
});
