import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { insertMessage } from './insert_message.ts';
import { listMessages } from './list_messages.ts';
import { upsertAccount } from './upsert_account.ts';
import { upsertFolder } from './upsert_folder.ts';

describe('listMessages', () => {
	it('lists with limit', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f = upsertFolder(db, { accountId: a.id, path: 'INBOX' });
		const base = {
			folderId: f.id,
			messageId: null,
			inReplyTo: null,
			references: [] as string[],
			threadId: null,
			from: null,
			to: [] as { address: string }[],
			cc: [] as { address: string }[],
			bcc: [] as { address: string }[],
			replyTo: null,
			subject: 'S',
			date: '2026-03-27T12:00:00.000Z',
			receivedAt: '2026-03-27T12:00:00.000Z',
			envelopeFrom: null,
			envelopeTo: [] as { address: string }[],
			flags: [] as string[],
			labels: [] as string[],
			size: null,
			bodyStructure: null,
			hasAttachments: false,
			modSeq: null,
		};
		insertMessage(db, { ...base, uid: 1 });
		insertMessage(db, { ...base, uid: 2, date: '2026-03-28T12:00:00.000Z' });
		const list = listMessages(db, f.id, { limit: 1, sort: 'date', order: 'desc' });
		assert.equal(list.length, 1);
		assert.equal(list[0]?.uid, 2);
		db.close();
	});
});
