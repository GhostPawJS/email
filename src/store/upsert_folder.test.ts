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

	it('preserves uidValidity when upserting without sync fields', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f1 = upsertFolder(db, {
			accountId: a.id,
			path: 'INBOX',
			uidValidity: 42,
			uidNext: 100,
			highestModSeq: 999,
			lastSyncedAt: '2026-03-27T00:00:00Z',
		});
		assert.equal(f1.uidValidity, 42);
		assert.equal(f1.uidNext, 100);
		assert.equal(f1.highestModSeq, 999);
		assert.equal(f1.lastSyncedAt, '2026-03-27T00:00:00Z');

		// Re-upsert without sync fields (simulates refreshFolders path)
		const f2 = upsertFolder(db, { accountId: a.id, path: 'INBOX' });
		assert.equal(f2.id, f1.id);
		assert.equal(f2.uidValidity, 42, 'uidValidity must be preserved');
		assert.equal(f2.uidNext, 100, 'uidNext must be preserved');
		assert.equal(f2.highestModSeq, 999, 'highestModSeq must be preserved');
		assert.equal(f2.lastSyncedAt, '2026-03-27T00:00:00Z', 'lastSyncedAt must be preserved');
		db.close();
	});

	it('overwrites sync fields when explicitly provided', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		upsertFolder(db, { accountId: a.id, path: 'INBOX', uidValidity: 42 });
		const f = upsertFolder(db, { accountId: a.id, path: 'INBOX', uidValidity: 99 });
		assert.equal(f.uidValidity, 99);
		db.close();
	});
});
