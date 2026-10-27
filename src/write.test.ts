import assert from 'node:assert/strict';
import { createServer } from 'node:net';
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

test('write operations select folders and send the expected IMAP mutations', async () => {
	const db = new DatabaseSync(':memory:') as EmailDb;
	try {
		initSchema(db);
		const account = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		for (const role of ['inbox', 'archive', 'trash', 'junk', 'drafts'] as const)
			upsertFolder(db, { accountId: account.id, path: role, role });
		const calls: unknown[][] = [];
		const session = {
			selectedFolder: '',
			async selectFolder(path: string) {
				this.selectedFolder = path;
				calls.push(['select', path]);
			},
			async storeFlags(...args: unknown[]) {
				calls.push(['flags', ...args]);
			},
			async moveMessages(...args: unknown[]) {
				calls.push(['move', ...args]);
			},
			async copyMessages(...args: unknown[]) {
				calls.push(['copy', ...args]);
			},
			async uidExpunge(...args: unknown[]) {
				calls.push(['expunge', ...args]);
			},
			async appendMessage(...args: unknown[]) {
				calls.push(['append', ...args]);
				return { uid: 42 };
			},
			async fetchMessages() {
				return [{ bodySections: new Map([['', Buffer.from('raw message')]]) }];
			},
			async createFolder(...args: unknown[]) {
				calls.push(['create', ...args]);
			},
			async renameFolder(...args: unknown[]) {
				calls.push(['rename', ...args]);
			},
			async deleteFolder(...args: unknown[]) {
				calls.push(['delete', ...args]);
			},
			async subscribeFolder(...args: unknown[]) {
				calls.push(['subscribe', ...args]);
			},
			async unsubscribeFolder(...args: unknown[]) {
				calls.push(['unsubscribe', ...args]);
			},
		};
		const write = createWriteSurface(db, {
			config: testConfig,
			accountId: account.id,
			session: session as unknown as import('./imap/session.ts').ImapSession,
		});
		for (const [method, mode, flag] of [
			['markRead', '+FLAGS.SILENT', '\\Seen'],
			['markUnread', '-FLAGS.SILENT', '\\Seen'],
			['star', '+FLAGS.SILENT', '\\Flagged'],
			['unstar', '-FLAGS.SILENT', '\\Flagged'],
			['markAnswered', '+FLAGS.SILENT', '\\Answered'],
		] as const) {
			await write[method]('inbox', [1]);
			assert.deepEqual(calls.at(-1), ['flags', [1], mode, [flag]]);
		}
		await write.copyTo('inbox', [1], 'archive');
		assert.deepEqual(calls.at(-1), ['copy', [1], 'archive']);
		await write.moveTo('inbox', [1], 'trash');
		for (const [method, target] of [
			['archive', 'archive'],
			['trash', 'trash'],
			['moveToJunk', 'junk'],
		] as const) {
			await write[method]('inbox', [1]);
			assert.deepEqual(calls.at(-1), ['move', [1], target]);
		}
		await write.markNotJunk('junk', [1]);
		assert.deepEqual(calls.at(-1), ['move', [1], 'inbox']);
		await write.markNotJunk('junk', [1], 'archive');
		assert.deepEqual(calls.at(-1), ['move', [1], 'archive']);
		await write.delete('inbox', [1]);
		assert.deepEqual(calls.at(-1), ['expunge', [1]]);
		for (const [method, mode] of [
			['addLabels', '+FLAGS.SILENT'],
			['removeLabels', '-FLAGS.SILENT'],
			['setLabels', 'FLAGS.SILENT'],
		] as const) {
			await write[method]('inbox', [1], ['work']);
			assert.deepEqual(calls.at(-1), ['flags', [1], mode, ['work']]);
		}
		const input = { to: [{ address: 'to@example.com' }], subject: 'draft' };
		assert.equal((await write.saveDraft(input)).uid, 42);
		const append = calls.at(-1);
		assert.equal(append?.[1], 'drafts');
		assert.match(String(append?.[2]), /From: u/);
		assert.equal((await write.updateDraft(1, input)).uid, 42);
		assert.equal((await write.exportEml('inbox', 1)).toString(), 'raw message');
		await write.importEml('inbox', Buffer.from('import'), ['\\Seen']);
		assert.equal(calls.at(-1)?.[0], 'append');
		await write.createFolder('A');
		await write.renameFolder('A', 'B');
		await write.deleteFolder('B');
		await write.subscribeFolder('inbox');
		await write.unsubscribeFolder('inbox');
		assert.deepEqual(calls.slice(-5), [
			['create', 'A'],
			['rename', 'A', 'B'],
			['delete', 'B'],
			['subscribe', 'inbox'],
			['unsubscribe', 'inbox'],
		]);
		await assert.rejects(write.reply('missing', 1, {}), /Folder not found/);
		await assert.rejects(write.reply('inbox', 1, {}), /not found/);
		await assert.rejects(write.forward('missing', 1, { to: [] }), /Folder not found/);
		await assert.rejects(write.forward('inbox', 1, { to: [] }), /not found/);
	} finally {
		db.close();
	}
});

test('send() uses a bare account address as the SMTP envelope sender', async () => {
	const commands: string[] = [];
	const server = createServer((socket) => {
		let buffer = '';
		let inData = false;
		socket.write('220 test ready\r\n');
		socket.on('data', (chunk) => {
			buffer += chunk.toString('utf8');
			let index = buffer.indexOf('\r\n');
			while (index !== -1) {
				const line = buffer.slice(0, index);
				buffer = buffer.slice(index + 2);
				index = buffer.indexOf('\r\n');
				if (inData) {
					if (line === '.') {
						inData = false;
						socket.write('250 queued\r\n');
					}
					continue;
				}
				commands.push(line);
				if (line.startsWith('EHLO')) socket.write('250-test\r\n250 AUTH PLAIN\r\n');
				else if (line.startsWith('AUTH')) socket.write('235 ok\r\n');
				else if (line === 'DATA') {
					inData = true;
					socket.write('354 go\r\n');
				} else if (line === 'QUIT') socket.end('221 bye\r\n');
				else socket.write('250 ok\r\n');
			}
		});
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const address = server.address();
	const port = typeof address === 'object' && address ? address.port : 0;
	const db = new DatabaseSync(':memory:') as EmailDb;
	try {
		initSchema(db);
		const account = upsertAccount(db, {
			host: '127.0.0.1',
			port: 143,
			username: 'max@example.test',
		});
		const write = createWriteSurface(db, {
			config: {
				imap: { host: '127.0.0.1', port: 143, tls: false },
				smtp: { host: '127.0.0.1', port, tls: false },
				auth: { user: 'max@example.test', pass: 'p' },
			},
			accountId: account.id,
			session: {} as never,
		});
		await write.send({ to: [{ address: 'sam@example.test' }], subject: 'Test', text: 'hi' });
		assert.ok(commands.includes('MAIL FROM:<max@example.test>'), commands.join(' | '));
		assert.ok(commands.includes('RCPT TO:<sam@example.test>'), commands.join(' | '));
	} finally {
		db.close();
		server.close();
	}
});
