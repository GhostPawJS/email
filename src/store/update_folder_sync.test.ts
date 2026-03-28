import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { getFolderById } from './get_folder_by_id.ts';
import { updateFolderSync } from './update_folder_sync.ts';
import { upsertAccount } from './upsert_account.ts';
import { upsertFolder } from './upsert_folder.ts';

describe('updateFolderSync', () => {
	it('updates partial fields', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f = upsertFolder(db, { accountId: a.id, path: 'INBOX' });
		updateFolderSync(db, f.id, { uidNext: 99, messageCount: 3 });
		assert.equal(getFolderById(db, f.id)?.uidNext, 99);
		assert.equal(getFolderById(db, f.id)?.messageCount, 3);
		db.close();
	});
});
