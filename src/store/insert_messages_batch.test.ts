import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { insertMessagesBatch } from './insert_messages_batch.ts';
import { listMessages } from './list_messages.ts';
import { upsertAccount } from './upsert_account.ts';
import { upsertFolder } from './upsert_folder.ts';

describe('insertMessagesBatch', () => {
	it('inserts multiple in one transaction', () => {
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
			date: null,
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
		insertMessagesBatch(db, [
			{ ...base, uid: 1 },
			{ ...base, uid: 2 },
		]);
		assert.equal(listMessages(db, f.id).length, 2);
		db.close();
	});
});
