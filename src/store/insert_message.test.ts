import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { insertMessage } from './insert_message.ts';
import { upsertAccount } from './upsert_account.ts';
import { upsertFolder } from './upsert_folder.ts';

describe('insertMessage', () => {
	it('inserts and returns Message', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f = upsertFolder(db, { accountId: a.id, path: 'INBOX' });
		const m = insertMessage(db, {
			folderId: f.id,
			uid: 1,
			messageId: '<m@x.com>',
			inReplyTo: null,
			references: [],
			threadId: '<m@x.com>',
			from: { address: 'a@b.com' },
			to: [],
			cc: [],
			bcc: [],
			replyTo: null,
			subject: 'Hello',
			date: '2026-03-27T12:00:00.000Z',
			receivedAt: '2026-03-27T12:00:00.000Z',
			envelopeFrom: null,
			envelopeTo: [],
			flags: [],
			labels: [],
			size: 10,
			bodyStructure: null,
			hasAttachments: false,
			modSeq: null,
		});
		assert.equal(m.subject, 'Hello');
		assert.equal(m.uid, 1);
		db.close();
	});
});
