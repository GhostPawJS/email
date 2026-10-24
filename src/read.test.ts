import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import type { EmailDb } from './database.ts';
import { createReadSurface } from './read.ts';
import { initSchema } from './schema/index.ts';
import {
	insertAttachment,
	insertMessage,
	insertSyncLog,
	listSyncLog,
	upsertAccount,
	upsertBody,
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

test('read surface resolves cached bodies, attachments and missing resources', async () => {
	const db = new DatabaseSync(':memory:') as EmailDb;
	try {
		initSchema(db);
		const account = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const folder = upsertFolder(db, { accountId: account.id, path: 'INBOX' });
		const message = insertMessage(db, baseMessage(folder.id, 1, 'Cached'));
		const read = createReadSurface(db, account.id);
		assert.deepEqual(read.folderStatus('INBOX'), {
			messages: 0,
			unseen: 0,
			uidNext: 0,
			uidValidity: 0,
			highestModSeq: null,
		});
		assert.throws(() => read.folderStatus('missing'), /Folder not found/);
		assert.deepEqual(read.messages('missing'), []);
		assert.deepEqual(read.threads('missing'), []);
		assert.deepEqual(read.threads('INBOX'), []);
		assert.equal(read.getThread('missing').messages.length, 0);
		assert.equal(read.getDatabase(), db);
		assert.ok(read.stats());
		assert.deepEqual(read.search('absent'), []);
		assert.equal((await read.getMessage('INBOX', 1)).textPlain, null);
		upsertBody(db, message.id, 'plain', '<p>html</p>');
		assert.equal((await read.getMessage('INBOX', 1)).textHtml, '<p>html</p>');
		insertAttachment(db, {
			messageId: message.id,
			partPath: '1',
			inline: false,
			data: Buffer.from('file'),
		});
		assert.equal(read.listAttachments('INBOX', 1).length, 1);
		assert.deepEqual(read.listAttachments('missing', 1), []);
		assert.deepEqual(read.listAttachments('INBOX', 999), []);
		assert.equal((await read.getAttachment('INBOX', 1, '1')).data.toString(), 'file');
		await assert.rejects(read.getMessage('missing', 1), /Folder not found/);
		await assert.rejects(read.getMessage('INBOX', 999), /Message not found/);
		await assert.rejects(read.getAttachment('missing', 1, '1'), /Folder not found/);
		await assert.rejects(read.getAttachment('INBOX', 999, '1'), /Message not found/);
		await assert.rejects(read.getAttachment('INBOX', 1, '2'), /Attachment not found/);
	} finally {
		db.close();
	}
});
