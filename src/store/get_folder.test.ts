import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { getFolder } from './get_folder.ts';
import { upsertAccount } from './upsert_account.ts';
import { upsertFolder } from './upsert_folder.ts';

describe('getFolder', () => {
	it('finds by account and path', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		upsertFolder(db, { accountId: a.id, path: 'Sent' });
		assert.equal(getFolder(db, a.id, 'Sent')?.path, 'Sent');
		db.close();
	});
});
