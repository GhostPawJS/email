import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { upsertAccount } from './upsert_account.ts';

describe('upsertAccount', () => {
	it('inserts and replaces by id', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a1 = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		assert.ok(a1.id > 0);
		const a2 = upsertAccount(db, { id: a1.id, host: 'h2', port: 993, username: 'u' });
		assert.equal(a2.id, a1.id);
		assert.equal(a2.host, 'h2');
		db.close();
	});

	it('returns existing row when same (host, port, username) inserted twice', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a1 = upsertAccount(db, { host: 'imap.test.com', port: 993, username: 'user@test.com' });
		const a2 = upsertAccount(db, { host: 'imap.test.com', port: 993, username: 'user@test.com' });
		assert.equal(a1.id, a2.id);
		db.close();
	});

	it('updates label on conflict without creating a new row', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a1 = upsertAccount(db, { host: 'h', port: 993, username: 'u', label: 'old' });
		const a2 = upsertAccount(db, { host: 'h', port: 993, username: 'u', label: 'new' });
		assert.equal(a1.id, a2.id);
		assert.equal(a2.label, 'new');
		db.close();
	});

	it('preserves existing label when new label is null', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a1 = upsertAccount(db, { host: 'h', port: 993, username: 'u', label: 'keep me' });
		const a2 = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		assert.equal(a1.id, a2.id);
		assert.equal(a2.label, 'keep me');
		db.close();
	});

	it('distinguishes accounts on different ports', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a1 = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const a2 = upsertAccount(db, { host: 'h', port: 143, username: 'u' });
		assert.notEqual(a1.id, a2.id);
		db.close();
	});
});
