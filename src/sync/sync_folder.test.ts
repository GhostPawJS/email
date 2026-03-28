import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import type { EmailDb } from '../database.ts';
import type { ImapSession } from '../imap/session.ts';
import { initSchema } from '../schema/index.ts';
import { upsertAccount } from '../store/upsert_account.ts';
import { upsertFolder } from '../store/upsert_folder.ts';
import type { NegotiatedExtensions, SelectedFolder } from '../types/capability.ts';
import type { FetchResult } from '../types/imap_response.ts';
import { syncFolder } from './sync_folder.ts';

const noExtensions: NegotiatedExtensions = {
	condstore: false,
	qresync: false,
	move: false,
	uidplus: false,
	compress: false,
	idle: false,
	sort: false,
	thread: false,
	specialUse: false,
	namespace: false,
	id: false,
	quota: false,
	literalPlus: false,
	esearch: false,
	listStatus: false,
	binary: false,
	unselect: false,
	appendLimit: null,
};

describe('syncFolder', () => {
	it('routes to initialSync when folder has no uidValidity', async () => {
		const db = new DatabaseSync(':memory:') as EmailDb;
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f = upsertFolder(db, { accountId: a.id, path: 'INBOX' });

		const session: Partial<ImapSession> = {
			extensions: noExtensions,
			selectFolder: async (): Promise<SelectedFolder> => ({
				exists: 0,
				recent: 0,
				flags: [],
				permanentFlags: [],
				uidValidity: 1,
				uidNext: 1,
				highestModSeq: null,
			}),
			fetchMessages: async (): Promise<FetchResult[]> => [],
		};

		const result = await syncFolder(session as unknown as ImapSession, db, f);
		assert.equal(result.path, 'INBOX');
		db.close();
	});
});
