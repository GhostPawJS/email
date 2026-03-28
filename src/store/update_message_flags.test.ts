import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { getMessage } from './get_message.ts';
import { insertMessage } from './insert_message.ts';
import { updateMessageFlags } from './update_message_flags.ts';
import { upsertAccount } from './upsert_account.ts';
import { upsertFolder } from './upsert_folder.ts';

describe('updateMessageFlags', () => {
	it('updates flags json', () => {
		const db = new DatabaseSync(':memory:');
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
			receivedAt: '2026-03-27T12:00:00.000Z',
			envelopeFrom: null,
			envelopeTo: [],
			flags: [],
			labels: [],
			size: null,
			bodyStructure: null,
			hasAttachments: false,
			modSeq: null,
		});
		updateMessageFlags(db, f.id, 1, ['\\Seen']);
		assert.ok(getMessage(db, f.id, 1)?.flags.includes('\\Seen'));
		db.close();
	});
});
