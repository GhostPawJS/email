import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import type { EmailDb } from './database.ts';
import { createReadSurface } from './read.ts';
import { initSchema } from './schema/index.ts';
import {
	insertMessage,
	insertSyncLog,
	listSyncLog,
	upsertAccount,
	upsertFolder,
} from './store/index.ts';
import type { InsertMessageInput } from './types/message.ts';

function baseMessage(folderId: number, uid: number, subject: string): InsertMessageInput {
	return {
		folderId,
		uid,
		messageId: null,
		inReplyTo: null,
		references: [],
		threadId: null,
		from: null,
		to: [],
		cc: [],
		bcc: [],
		replyTo: null,
		subject,
		date: null,
		receivedAt: new Date().toISOString(),
		envelopeFrom: null,
		envelopeTo: [],
		flags: [],
		labels: [],
		size: null,
		bodyStructure: null,
		hasAttachments: false,
		modSeq: null,
	};
}

test('read surface exposes folders, messages, and sync log via the store', () => {
	const db = new DatabaseSync(':memory:') as EmailDb;

	try {
		initSchema(db);
		const account = upsertAccount(db, {
			host: 'imap.example.com',
			port: 993,
			username: 'primary@example.com',
			label: 'Primary',
		});
		const folder = upsertFolder(db, {
			accountId: account.id,
			path: 'INBOX',
			role: 'inbox',
		});
		insertMessage(db, baseMessage(folder.id, 1, 'Hello'));
		insertSyncLog(db, folder.id, 'pull', 0, 'ok');

		const read = createReadSurface(db, account.id);
		assert.equal(read.folders().length, 1);
		assert.equal(read.messages('INBOX').length, 1);
		assert.equal(read.messages('INBOX')[0]?.subject, 'Hello');
		const logs = listSyncLog(db, folder.id, { limit: 5 });
		assert.equal(logs.length, 1);
		assert.equal(logs[0]?.action, 'pull');
	} finally {
		db.close();
	}
});
