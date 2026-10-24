import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import type { EmailDb } from '../database.ts';
import { initSchema } from '../schema/index.ts';
import type { InsertMessageInput } from '../types/message.ts';
import * as store from './index.ts';

test('cache round trips populated and nullable records through all readers', () => {
	const db = new DatabaseSync(':memory:') as EmailDb;
	try {
		initSchema(db);
		const account = store.upsertAccount(db, {
			host: 'h',
			port: 993,
			username: 'u',
			label: 'Primary',
		});
		const nullableAccount = store.upsertAccount(db, { host: 'h', port: 993, username: 'v' });
		assert.equal(store.listAccounts(db).length, 2);
		assert.equal(store.getAccount(db, nullableAccount.id)?.label, null);
		const folder = store.upsertFolder(db, {
			accountId: account.id,
			path: 'INBOX',
			delimiter: '.',
			role: 'inbox',
			uidValidity: 1,
			uidNext: 3,
			highestModSeq: 4,
			messageCount: 2,
			unseenCount: 1,
			lastSyncedAt: '2026-01-01',
		});
		const empty = store.upsertFolder(db, { accountId: account.id, path: 'Empty' });
		assert.deepEqual(store.getFolder(db, account.id, folder.path), folder);
		assert.deepEqual(store.getFolderById(db, folder.id), folder);
		assert.deepEqual(store.getFolderById(db, empty.id), empty);
		assert.equal(store.listFolders(db, account.id).length, 2);
		const address = { address: 'a@b', name: 'Alice' };
		const input: InsertMessageInput = {
			folderId: folder.id,
			uid: 1,
			messageId: '<id>',
			inReplyTo: '<parent>',
			references: ['<parent>'],
			threadId: 'thread',
			from: address,
			to: [address],
			cc: [address],
			bcc: [address],
			replyTo: address,
			subject: 'Roundtrip',
			date: '2026-01-01',
			receivedAt: '2026-01-01',
			envelopeFrom: address,
			envelopeTo: [address],
			flags: ['\\Seen'],
			labels: ['work'],
			size: 20,
			bodyStructure: {
				type: 'text',
				subtype: 'plain',
				params: {},
				id: null,
				description: null,
				encoding: '7bit',
				size: 20,
				partPath: '1',
			},
			hasAttachments: true,
			modSeq: 4,
		};
		const message = store.insertMessage(db, input);
		assert.deepEqual(store.getMessageById(db, message.id), message);
		assert.deepEqual(store.getMessage(db, folder.id, 1), message);
		assert.equal(message.replyTo?.address, 'a@b');
		assert.equal(message.bodyStructure?.type, 'text');
		store.upsertBody(db, message.id, null, null, Buffer.from('raw'));
		assert.equal(store.getBody(db, message.id)?.textPlain, null);
		for (const populated of [true, false]) {
			const attachment = store.insertAttachment(db, {
				messageId: message.id,
				partPath: populated ? '1' : '2',
				inline: populated,
				...(populated
					? {
							filename: 'a.txt',
							mimeType: 'text/plain',
							size: 4,
							contentId: 'id',
							data: Buffer.from('file'),
						}
					: {}),
			});
			const full = store.getAttachmentData(db, attachment.id);
			assert.equal(full?.filename, populated ? 'a.txt' : null);
			assert.equal(full?.data.toString(), populated ? 'file' : '');
		}
		assert.equal(store.listAttachments(db, message.id).length, 2);
		for (const sort of ['date', 'from', 'subject', 'size'] as const)
			assert.equal(
				store.listMessages(db, folder.id, { sort, order: 'asc', limit: 1, offset: 0 })[0]?.id,
				message.id,
			);
		assert.equal(store.listThreads(db, folder.id, { limit: 1, offset: 0 })[0]?.messageCount, 1);
		assert.equal(store.getThread(db, 'thread').participants.length, 1);
		assert.equal(store.getStats(db, account.id).totalMessages, 1);
		store.insertSyncLog(db, folder.id, 'sync', 1);
		assert.equal(store.listSyncLog(db, folder.id, {})[0]?.details, null);
		assert.equal(store.listMessages(db, folder.id, {}).length, 1);
		assert.equal(store.listThreads(db, folder.id, {}).length, 1);
		assert.deepEqual(store.searchMessages(db, 'absent', { folder: 'INBOX', limit: 1 }), []);
		// Old cache rows may contain invalid JSON; readers retain their documented defaults.
		db.prepare('UPDATE messages SET flags = ?, labels = ?, "references" = ? WHERE id = ?').run(
			'invalid',
			'',
			null,
			message.id,
		);
		const recovered = store.getMessageById(db, message.id);
		assert.deepEqual(recovered?.flags, []);
		assert.deepEqual(recovered?.labels, []);
		assert.deepEqual(recovered?.references, []);
	} finally {
		db.close();
	}
});
