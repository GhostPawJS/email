import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { getThread } from './get_thread.ts';
import { insertMessage } from './insert_message.ts';
import { upsertAccount } from './upsert_account.ts';
import { upsertFolder } from './upsert_folder.ts';

describe('getThread', () => {
	it('aggregates messages by thread_id', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f = upsertFolder(db, { accountId: a.id, path: 'INBOX' });
		const tid = '<root@x.com>';
		insertMessage(db, {
			folderId: f.id,
			uid: 1,
			messageId: '<a@x.com>',
			inReplyTo: null,
			references: [],
			threadId: tid,
			from: { address: 'a@b.com' },
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
		const t = getThread(db, tid);
		assert.equal(t.messageCount, 1);
		db.close();
	});
});
