import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import type { EmailDb } from '../database.ts';
import type { ImapSession } from '../imap/session.ts';
import { initSchema } from '../schema/index.ts';
import { insertMessage } from '../store/insert_message.ts';
import { upsertAccount } from '../store/upsert_account.ts';
import { upsertFolder } from '../store/upsert_folder.ts';
import type { SelectedFolder } from '../types/capability.ts';
import type { FetchResult } from '../types/imap_response.ts';
import { incrementalSyncQresync } from './incremental_sync_qresync.ts';

describe('incrementalSyncQresync', () => {
	it('detects new messages and flag changes', async () => {
		const db = new DatabaseSync(':memory:') as EmailDb;
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f = upsertFolder(db, { accountId: a.id, path: 'INBOX', uidValidity: 1 });
		insertMessage(db, {
			folderId: f.id,
			uid: 1,
			messageId: '<a>',
			inReplyTo: null,
			references: [],
			threadId: null,
			from: null,
			to: [],
			cc: [],
			bcc: [],
			replyTo: null,
			subject: 'A',
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

		const fetchResults: FetchResult[] = [
			{
				uid: 1,
				flags: ['\\Seen'],
				internalDate: null,
				size: null,
				envelope: null,
				bodyStructure: null,
				modSeq: null,
				bodySections: new Map(),
			},
			{
				uid: 2,
				flags: [],
				internalDate: new Date().toISOString(),
				size: 50,
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
					messageId: '<b>',
				},
				bodyStructure: null,
				modSeq: null,
				bodySections: new Map(),
			},
		];

		const session: Partial<ImapSession> = {
			selectFolder: async (): Promise<SelectedFolder> => ({
				exists: 2,
				recent: 0,
				flags: [],
				permanentFlags: [],
				uidValidity: 1,
				uidNext: 3,
				highestModSeq: null,
			}),
			fetchMessages: async (): Promise<FetchResult[]> => fetchResults,
		};

		const result = await incrementalSyncQresync(session as unknown as ImapSession, db, f);
		assert.equal(result.newMessages, 1);
		assert.equal(result.updatedFlags, 1);
		db.close();
	});
});
