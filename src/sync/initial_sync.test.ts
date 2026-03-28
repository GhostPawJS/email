import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import type { EmailDb } from '../database.ts';
import type { ImapSession } from '../imap/session.ts';
import { initSchema } from '../schema/index.ts';
import { listMessages } from '../store/list_messages.ts';
import { upsertAccount } from '../store/upsert_account.ts';
import { upsertFolder } from '../store/upsert_folder.ts';
import type { SelectedFolder } from '../types/capability.ts';
import type { FetchResult } from '../types/imap_response.ts';
import { initialSync } from './initial_sync.ts';

function makeSession(fetchResults: FetchResult[]): Partial<ImapSession> {
	return {
		selectFolder: async (_path: string): Promise<SelectedFolder> => ({
			exists: fetchResults.length,
			recent: 0,
			flags: [],
			permanentFlags: [],
			uidValidity: 1234,
			uidNext: fetchResults.length + 1,
			highestModSeq: null,
		}),
		fetchMessages: async (_range: string, _items: string[]): Promise<FetchResult[]> => fetchResults,
	};
}

describe('initialSync', () => {
	it('inserts messages and updates folder meta', async () => {
		const db = new DatabaseSync(':memory:') as EmailDb;
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f = upsertFolder(db, { accountId: a.id, path: 'INBOX' });

		const results: FetchResult[] = [
			{
				uid: 1,
				flags: ['\\Seen'],
				internalDate: new Date().toISOString(),
				size: 100,
				envelope: {
					date: new Date().toISOString(),
					subject: 'Hello',
					from: [],
					sender: [],
					replyTo: [],
					to: [],
					cc: [],
					bcc: [],
					inReplyTo: null,
					messageId: '<msg1@test>',
				},
				bodyStructure: null,
				modSeq: null,
				bodySections: new Map(),
			},
		];

		const session = makeSession(results) as unknown as ImapSession;
		const result = await initialSync(session, db, f.id, 'INBOX');

		assert.equal(listMessages(db, f.id).length, 1);
		assert.equal(result.newMessages, 1);
		db.close();
	});
});
