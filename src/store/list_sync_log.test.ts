import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { insertSyncLog } from './insert_sync_log.ts';
import { listSyncLog } from './list_sync_log.ts';
import { upsertAccount } from './upsert_account.ts';
import { upsertFolder } from './upsert_folder.ts';

describe('listSyncLog', () => {
	it('orders by synced_at desc', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f = upsertFolder(db, { accountId: a.id, path: 'INBOX' });
		insertSyncLog(db, f.id, 'a', 1);
		insertSyncLog(db, f.id, 'b', 2);
		const logs = listSyncLog(db, f.id);
		assert.equal(logs[0]?.action, 'b');
		db.close();
	});
});
