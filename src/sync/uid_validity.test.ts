import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import type { EmailDb } from '../database.ts';
import { initSchema } from '../schema/index.ts';
import { insertMessage } from '../store/insert_message.ts';
import { listMessages } from '../store/list_messages.ts';
import { listSyncLog } from '../store/list_sync_log.ts';
import { upsertAccount } from '../store/upsert_account.ts';
import { upsertFolder } from '../store/upsert_folder.ts';
import { handleUidValidityChange } from './uid_validity.ts';

describe('handleUidValidityChange', () => {
	it('deletes messages and inserts sync log entry', () => {
		const db = new DatabaseSync(':memory:') as EmailDb;
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const f = upsertFolder(db, { accountId: a.id, path: 'INBOX', uidValidity: 100 });
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
			subject: 'Test',
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

		assert.equal(listMessages(db, f.id).length, 1);
		handleUidValidityChange(db, f);
		assert.equal(listMessages(db, f.id).length, 0);
		const logs = listSyncLog(db, f.id, { limit: 5 });
		assert.ok(logs.some((l) => l.action === 'uidvalidity_reset'));
		db.close();
	});
});
