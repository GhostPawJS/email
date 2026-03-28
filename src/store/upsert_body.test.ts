import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { getBody } from './get_body.ts';
import { insertMessage } from './insert_message.ts';
import { upsertAccount } from './upsert_account.ts';
import { upsertBody } from './upsert_body.ts';
import { upsertFolder } from './upsert_folder.ts';

describe('upsertBody', () => {
	it('stores plain and html', () => {
		const db = new DatabaseSync(':memory:');
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
		upsertBody(db, m.id, 'hi', '<p>hi</p>');
		assert.equal(getBody(db, m.id)?.textPlain, 'hi');
		db.close();
	});
});
