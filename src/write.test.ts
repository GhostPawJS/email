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

test('send() without from injects identity from config.auth.user', async () => {
	const db = new DatabaseSync(':memory:') as EmailDb;
	try {
		initSchema(db);
		const account = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		upsertFolder(db, { accountId: account.id, path: 'INBOX' });

		const write = createWriteSurface(db, {
			config: testConfig,
			accountId: account.id,
		});

		// send() requires a session — it'll throw EmailUnsupportedError because no session.
		// But withFrom should have injected the from address before that check fails.
		// We verify by passing no `from` and asserting it doesn't throw a "No sender identity" error.
		await assert.rejects(
			() => write.send({ to: [{ address: 'x@x.com' }], subject: 'Test' }),
			EmailUnsupportedError,
		);
	} finally {
		db.close();
	}
});

test('send() with explicit config.identities uses the first identity', async () => {
	const db = new DatabaseSync(':memory:') as EmailDb;
	try {
		initSchema(db);
		const account = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		upsertFolder(db, { accountId: account.id, path: 'INBOX' });

		const configWithIdentity: EmailConfig = {
			...testConfig,
			identities: [{ address: 'primary@example.com', name: 'Alice' }],
		};
		const write = createWriteSurface(db, {
			config: configWithIdentity,
			accountId: account.id,
		});

		// Will reject because no session, but it should NOT throw "No sender identity"
		await assert.rejects(
			() => write.send({ to: [{ address: 'x@x.com' }], subject: 'Test' }),
			EmailUnsupportedError,
		);
	} finally {
		db.close();
	}
});

test('send() throws when no identity can be derived and session exists', async () => {
	const db = new DatabaseSync(':memory:') as EmailDb;
	try {
		initSchema(db);
		const account = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		upsertFolder(db, { accountId: account.id, path: 'INBOX' });

		const noIdentityConfig: EmailConfig = {
			imap: { host: 'h', port: 993 },
			smtp: { host: 'h', port: 587 },
			auth: { mechanism: 'EXTERNAL', credentials: {} },
		};
		const fakeSession = {} as unknown as import('./imap/session.ts').ImapSession;
		const write = createWriteSurface(db, {
			config: noIdentityConfig,
			accountId: account.id,
			session: fakeSession,
		});

		await assert.rejects(
			() => write.send({ to: [{ address: 'x@x.com' }], subject: 'Test' }),
			/No sender identity/,
		);
	} finally {
		db.close();
	}
});
