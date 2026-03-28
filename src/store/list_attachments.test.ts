import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { insertAttachment } from './insert_attachment.ts';
import { insertMessage } from './insert_message.ts';
import { listAttachments } from './list_attachments.ts';
import { upsertAccount } from './upsert_account.ts';
import { upsertFolder } from './upsert_folder.ts';

describe('listAttachments', () => {
	it('lists without binary data', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f = upsertFolder(db, { accountId: a.id, path: 'INBOX' });
		const m = insertMessage(db, {
			folderId: f.id,
			uid: 1,
			messageId: null,
			inReplyTo: null,
			references: [],
			threadId: null,
			from: null,
			to: [],
			cc: [],
			bcc: [],
			replyTo: null,
			subject: 'S',
			date: null,
			receivedAt: '2026-03-27T12:00:00.000Z',
			envelopeFrom: null,
			envelopeTo: [],
			flags: [],
			labels: [],
			size: null,
			bodyStructure: null,
			hasAttachments: false,
			modSeq: null,
		});
		insertAttachment(db, { messageId: m.id, partPath: '1', inline: false });
		assert.equal(listAttachments(db, m.id).length, 1);
		db.close();
	});
});
