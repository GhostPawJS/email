import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { insertMessage } from './insert_message.ts';
import { upsertAccount } from './upsert_account.ts';
import { upsertFolder } from './upsert_folder.ts';

describe('insertMessage', () => {
	const makeInput = (folderId: number, uid: number) => ({
		folderId,
		uid,
		messageId: '<m@x.com>',
		inReplyTo: null,
		references: [] as string[],
		threadId: '<m@x.com>',
		from: { address: 'a@b.com' } as { address: string },
		to: [] as { address: string }[],
		cc: [] as { address: string }[],
		bcc: [] as { address: string }[],
		replyTo: null,
		subject: 'Hello',
		date: '2026-03-27T12:00:00.000Z',
		receivedAt: '2026-03-27T12:00:00.000Z',
		envelopeFrom: null,
		envelopeTo: [] as { address: string }[],
		flags: [] as string[],
		labels: [] as string[],
		size: 10,
		bodyStructure: null,
		hasAttachments: false,
		modSeq: null,
	});

	it('inserts and returns Message', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f = upsertFolder(db, { accountId: a.id, path: 'INBOX' });
		const m = insertMessage(db, makeInput(f.id, 1));
		assert.equal(m.subject, 'Hello');
		assert.equal(m.uid, 1);
		db.close();
	});

	it('throws on duplicate (folder_id, uid)', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f = upsertFolder(db, { accountId: a.id, path: 'INBOX' });
		insertMessage(db, makeInput(f.id, 1));
		assert.throws(() => insertMessage(db, makeInput(f.id, 1)), /UNIQUE constraint failed/);
		db.close();
	});

	it('allows same uid in different folders', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f1 = upsertFolder(db, { accountId: a.id, path: 'INBOX' });
		const f2 = upsertFolder(db, { accountId: a.id, path: 'Sent' });
		const m1 = insertMessage(db, makeInput(f1.id, 1));
		const m2 = insertMessage(db, makeInput(f2.id, 1));
		assert.notEqual(m1.id, m2.id);
		db.close();
	});
});
