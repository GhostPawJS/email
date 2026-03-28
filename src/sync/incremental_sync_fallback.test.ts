import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import type { EmailDb } from '../database.ts';
import type { ImapSession } from '../imap/session.ts';
import { initSchema } from '../schema/index.ts';
import { insertMessage } from '../store/insert_message.ts';
import { listMessages } from '../store/list_messages.ts';
import { upsertAccount } from '../store/upsert_account.ts';
import { upsertFolder } from '../store/upsert_folder.ts';
import type { SelectedFolder } from '../types/capability.ts';
import type { FetchResult } from '../types/imap_response.ts';
import { incrementalSyncFallback, UIDVALIDITY_CHANGED } from './incremental_sync_fallback.ts';

describe('incrementalSyncFallback', () => {
	it('detects new and expunged messages', async () => {
		const db = new DatabaseSync(':memory:') as EmailDb;
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f = upsertFolder(db, { accountId: a.id, path: 'INBOX', uidValidity: 1 });
		insertMessage(db, {
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
			subject: 'Old',
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
		});

		const newFetch: FetchResult[] = [
			{
				uid: 2,
				flags: [],
				internalDate: new Date().toISOString(),
				size: 100,
				envelope: {
					date: null,
					subject: 'New',
					from: [],
					sender: [],
					replyTo: [],
					to: [],
					cc: [],
					bcc: [],
					inReplyTo: null,
					messageId: '<new>',
				},
				bodyStructure: null,
				modSeq: null,
				bodySections: new Map(),
			},
		];

		let fetchCallCount = 0;
		const session: Partial<ImapSession> = {
			selectFolder: async (): Promise<SelectedFolder> => ({
				exists: 1,
				recent: 0,
				flags: [],
				permanentFlags: [],
				uidValidity: 1, // same UIDVALIDITY
				uidNext: 3,
				highestModSeq: null,
			}),
			searchMessages: async (): Promise<number[]> => [2], // uid 1 removed, uid 2 new
			fetchMessages: async (): Promise<FetchResult[]> => {
				fetchCallCount++;
				return fetchCallCount === 1 ? newFetch : newFetch;
			},
		};

		const result = await incrementalSyncFallback(session as unknown as ImapSession, db, f);
		assert.notEqual(result, UIDVALIDITY_CHANGED);
		if (result !== UIDVALIDITY_CHANGED) {
			assert.equal(result.newMessages, 1);
			assert.equal(result.expunged, 1);
		}
		assert.equal(listMessages(db, f.id).length, 1);
		db.close();
	});

	it('returns UIDVALIDITY_CHANGED when UIDVALIDITY differs', async () => {
		const db = new DatabaseSync(':memory:') as EmailDb;
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f = upsertFolder(db, { accountId: a.id, path: 'INBOX', uidValidity: 1 });

		const session: Partial<ImapSession> = {
			selectFolder: async (): Promise<SelectedFolder> => ({
				exists: 0,
				recent: 0,
				flags: [],
				permanentFlags: [],
				uidValidity: 999, // different!
				uidNext: 1,
				highestModSeq: null,
			}),
		};

		const result = await incrementalSyncFallback(session as unknown as ImapSession, db, f);
		assert.equal(result, UIDVALIDITY_CHANGED);
		db.close();
	});
});
