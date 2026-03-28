import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import type { EmailDb } from './database.ts';
import { EmailUnsupportedError } from './errors.ts';
import { initSchema } from './schema/index.ts';
import { insertMessage, upsertAccount, upsertFolder } from './store/index.ts';
import type { EmailConfig } from './types/config.ts';
import type { InsertMessageInput } from './types/message.ts';
import { createWriteSurface } from './write.ts';

function baseMessage(folderId: number, uid: number, subject: string): InsertMessageInput {
	return {
		folderId,
		uid,
		messageId: null,
		inReplyTo: null,
		references: [],
		threadId: null,
		from: null,
		to: [],
		cc: [],
		bcc: [],
		replyTo: null,
		subject,
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
	};
}

const testConfig: EmailConfig = {
	imap: { host: 'imap.example.com', port: 993 },
	smtp: { host: 'smtp.example.com', port: 587 },
	auth: { user: 'u', pass: 'p' },
};

test('write surface rejects network operations until IMAP/SMTP are wired', async () => {
	const db = new DatabaseSync(':memory:') as EmailDb;

	try {
		initSchema(db);
		const account = upsertAccount(db, {
			host: 'imap.example.com',
			port: 993,
			username: 'primary@example.com',
		});
		const folder = upsertFolder(db, { accountId: account.id, path: 'INBOX' });
		insertMessage(db, baseMessage(folder.id, 1, 'Hello'));

		const write = createWriteSurface(db, {
			config: testConfig,
			accountId: account.id,
		});

		await assert.rejects(
			() =>
				write.send({
					from: { address: 'a@b.com' },
					to: [{ address: 'c@d.com' }],
					subject: 'S',
				}),
			EmailUnsupportedError,
		);
	} finally {
		db.close();
	}
});
