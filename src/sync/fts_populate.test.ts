import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import type { EmailDb } from '../database.ts';
import { initSchema } from '../schema/index.ts';
import { insertMessage } from '../store/insert_message.ts';
import { searchMessages } from '../store/search_messages.ts';
import { upsertAccount } from '../store/upsert_account.ts';
import { upsertFolder } from '../store/upsert_folder.ts';
import { populateFts } from './fts_populate.ts';

describe('populateFts', () => {
	it('updates FTS so body text is searchable', () => {
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
			subject: 'quarterly report',
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

		// Initially body text is empty -- search for body term returns nothing
		const before = searchMessages(db, 'budgetary');
		assert.equal(before.length, 0);

		// Populate with body text
		populateFts(db, m.id, 'The budgetary forecast is attached.', null);

		const after = searchMessages(db, 'budgetary');
		assert.equal(after.length, 1);
		db.close();
	});
});
