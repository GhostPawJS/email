import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { insertSyncLog } from './insert_sync_log.ts';
import { upsertAccount } from './upsert_account.ts';
import { upsertFolder } from './upsert_folder.ts';

describe('insertSyncLog', () => {
	it('inserts row', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f = upsertFolder(db, { accountId: a.id, path: 'INBOX' });
		insertSyncLog(db, f.id, 'sync', 1, 'ok');
		const c = db.prepare('SELECT COUNT(*) as n FROM sync_log').get() as { n: number };
		assert.equal(c.n, 1);
		db.close();
	});
});
