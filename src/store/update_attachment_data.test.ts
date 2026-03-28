import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { getAttachmentData } from './get_attachment_data.ts';
import { insertAttachment } from './insert_attachment.ts';
import { insertMessage } from './insert_message.ts';
import { updateAttachmentData } from './update_attachment_data.ts';
import { upsertAccount } from './upsert_account.ts';
import { upsertFolder } from './upsert_folder.ts';

describe('updateAttachmentData', () => {
	it('updates blob', () => {
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
		const att = insertAttachment(db, {
			messageId: m.id,
			partPath: '1',
			inline: false,
		});
		updateAttachmentData(db, att.id, Buffer.from('x'));
		assert.equal(getAttachmentData(db, att.id)?.data.toString(), 'x');
		db.close();
	});
});
