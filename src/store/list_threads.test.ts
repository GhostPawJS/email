import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { insertMessage } from './insert_message.ts';
import { listThreads } from './list_threads.ts';
import { upsertAccount } from './upsert_account.ts';
import { upsertFolder } from './upsert_folder.ts';

describe('listThreads', () => {
	it('groups by thread_id', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f = upsertFolder(db, { accountId: a.id, path: 'INBOX' });
		const tid = '<t@x.com>';
		const base = {
			folderId: f.id,
			messageId: null,
			inReplyTo: null,
			references: [] as string[],
			threadId: tid,
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
		insertMessage(db, { ...base, uid: 2 });
		const threads = listThreads(db, f.id);
		assert.equal(threads.length, 1);
		assert.equal(threads[0]?.messageCount, 2);
		db.close();
	});
});
