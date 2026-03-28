import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import type { EmailDb } from '../database.ts';
import type { ImapSession } from '../imap/session.ts';
import { initSchema } from '../schema/init_schema.ts';
import { insertMessage } from '../store/insert_message.ts';
import { upsertAccount } from '../store/upsert_account.ts';
import { upsertFolder } from '../store/upsert_folder.ts';
import type { FetchResult } from '../types/imap_response.ts';
import { fetchBody } from './fetch_body.ts';

function makeSession(opts: { selectedFolder?: string | null } = {}) {
	const calls: string[] = [];
	const session = {
		get selectedFolder() {
			return opts.selectedFolder ?? null;
		},
		selectFolder: async (path: string) => {
			calls.push(`select:${path}`);
			opts.selectedFolder = path;
		},
		fetchMessages: async (_range: string, _items: string[]): Promise<FetchResult[]> => {
			calls.push('fetch');
			return [
				{
					uid: 1,
					flags: [],
					internalDate: null,
					size: null,
					envelope: null,
					bodyStructure: null,
					modSeq: null,
					bodySections: new Map([['', Buffer.from('Subject: Hi\r\n\r\nBody text')]]),
				} as unknown as FetchResult,
			];
		},
	};
	return { session: session as unknown as ImapSession, calls };
}

describe('fetchBody', () => {
	it('calls selectFolder before fetchMessages', async () => {
		const db = new DatabaseSync(':memory:') as EmailDb;
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f = upsertFolder(db, { accountId: a.id, path: 'INBOX' });
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
			subject: 'S',
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

		const { session, calls } = makeSession();
		await fetchBody(session, db, a.id, 'INBOX', 1);

		assert.ok(calls.includes('select:INBOX'), 'selectFolder must be called');
		assert.ok(calls.indexOf('select:INBOX') < calls.indexOf('fetch'), 'select before fetch');
		db.close();
	});

	it('skips selectFolder when folder is already selected', async () => {
		const db = new DatabaseSync(':memory:') as EmailDb;
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f = upsertFolder(db, { accountId: a.id, path: 'INBOX' });
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
			subject: 'S',
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

		const { session, calls } = makeSession({ selectedFolder: 'INBOX' });
		await fetchBody(session, db, a.id, 'INBOX', 1);

		assert.ok(!calls.includes('select:INBOX'), 'should skip select when already on INBOX');
		assert.ok(calls.includes('fetch'));
		db.close();
	});
});
