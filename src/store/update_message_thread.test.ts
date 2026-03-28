import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { getMessageById } from './get_message_by_id.ts';
import { insertMessage } from './insert_message.ts';
import { updateMessageThread } from './update_message_thread.ts';
import { upsertAccount } from './upsert_account.ts';
import { upsertFolder } from './upsert_folder.ts';

describe('updateMessageThread', () => {
	it('sets thread_id', () => {
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
		updateMessageThread(db, m.id, '<root@x.com>');
		assert.equal(getMessageById(db, m.id)?.threadId, '<root@x.com>');
		db.close();
	});
});
