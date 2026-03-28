import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import type { EmailDb } from '../database.ts';
import type { ImapSession } from '../imap/session.ts';
import { initSchema } from '../schema/init_schema.ts';
import { insertAttachment } from '../store/insert_attachment.ts';
import { insertMessage } from '../store/insert_message.ts';
import { upsertAccount } from '../store/upsert_account.ts';
import { upsertFolder } from '../store/upsert_folder.ts';
import type { FetchResult } from '../types/imap_response.ts';
import { fetchAttachment } from './fetch_attachment.ts';

function makeSession(partData: Buffer, opts: { selectedFolder?: string | null } = {}) {
	const calls: string[] = [];
	const session = {
		get selectedFolder() {
			return opts.selectedFolder ?? null;
		},
		selectFolder: async (path: string) => {
			calls.push(`select:${path}`);
			opts.selectedFolder = path;
		},
		fetchMessages: async (_range: string, items: string[]): Promise<FetchResult[]> => {
			calls.push('fetch');
			const partPath = items[0]?.match(/BODY\.PEEK\[(.+?)\]/)?.[1] ?? '';
			return [
				{
					uid: 1,
					flags: [],
					internalDate: null,
					size: null,
					envelope: null,
					bodyStructure: null,
					modSeq: null,
					bodySections: new Map([[partPath, partData]]),
				} as unknown as FetchResult,
			];
		},
	};
	return { session: session as unknown as ImapSession, calls };
}

describe('fetchAttachment', () => {
	it('calls selectFolder before fetchMessages', async () => {
		const db = new DatabaseSync(':memory:') as EmailDb;
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f = upsertFolder(db, { accountId: a.id, path: 'INBOX' });
		const m = insertMessage(db, {
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
			hasAttachments: true,
			modSeq: null,
		});

		insertAttachment(db, {
			messageId: m.id,
			partPath: '2',
			mimeType: 'application/pdf',
			filename: 'test.pdf',
			size: 100,
			inline: false,
		});

		const rawPdfData = Buffer.from('PDF-DATA');
		const { session, calls } = makeSession(rawPdfData);
		await fetchAttachment(session, db, a.id, 'INBOX', 1, '2');

		assert.ok(calls.includes('select:INBOX'));
		assert.ok(calls.indexOf('select:INBOX') < calls.indexOf('fetch'));
		db.close();
	});

	it('skips selectFolder when folder is already selected', async () => {
		const db = new DatabaseSync(':memory:') as EmailDb;
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f = upsertFolder(db, { accountId: a.id, path: 'INBOX' });
		const m = insertMessage(db, {
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
			hasAttachments: true,
			modSeq: null,
		});

		insertAttachment(db, {
			messageId: m.id,
			partPath: '2',
			mimeType: 'application/pdf',
			filename: 'test.pdf',
			size: 100,
			inline: false,
		});

		const rawPdfData = Buffer.from('PDF-DATA');
		const { session, calls } = makeSession(rawPdfData, { selectedFolder: 'INBOX' });
		await fetchAttachment(session, db, a.id, 'INBOX', 1, '2');

		assert.ok(!calls.includes('select:INBOX'), 'should skip select when already on INBOX');
		assert.ok(calls.includes('fetch'));
		db.close();
	});
});
