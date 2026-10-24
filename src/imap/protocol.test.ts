import assert from 'node:assert/strict';
import { syncBuiltinESMExports } from 'node:module';
import net from 'node:net';
import { Duplex } from 'node:stream';
import test from 'node:test';
import { Mailbox } from '../mailbox.ts';
import type { EmailConfig } from '../types/config.ts';
import { ImapSession } from './session.ts';

// A protocol peer at the socket boundary, with the real tokenizer and dispatcher.
function peer(commands: string[]): Duplex {
	let literalTag = '';
	const socket = new Duplex({
		read() {},
		write(chunk, _encoding, callback) {
			const line = chunk.toString().trim();
			commands.push(line);
			const [tag = '', command = ''] = line.split(' ');
			let response = `${tag} OK completed\r\n`;
			if (literalTag) {
				response = `${literalTag} OK [APPENDUID 1 88] appended\r\n`;
				literalTag = '';
			} else if (command === 'APPEND') {
				literalTag = tag;
				response = '+ ready\r\n';
			} else if (command === 'CAPABILITY') {
				response = `* CAPABILITY IMAP4rev1 AUTH=PLAIN MOVE ID QRESYNC\r\n${response}`;
			} else if (command === 'LIST') {
				response = `* LIST (\\Inbox) "/" INBOX\r\n* LIST (\\Drafts) "/" Drafts\r\n${response}`;
			} else if (command === 'SELECT' || command === 'EXAMINE') {
				response = `* 2 EXISTS\r\n* 1 RECENT\r\n* FLAGS (\\Seen)\r\n* OK [PERMANENTFLAGS (\\Seen \\*)] flags\r\n* OK [UIDVALIDITY 7] valid\r\n* OK [UIDNEXT 3] next\r\n* OK [HIGHESTMODSEQ 9] mod\r\n${response}`;
			} else if (command === 'STATUS') {
				response = `* STATUS INBOX (MESSAGES 2 UNSEEN 1 UIDNEXT 3 UIDVALIDITY 7 HIGHESTMODSEQ 9)\r\n${response}`;
			} else if (line.includes('UID SEARCH')) {
				response = `* SEARCH 1 2\r\n${response}`;
			} else if (line.includes('UID FETCH')) {
				response = `* 1 FETCH (UID 1 FLAGS (\\Seen) INTERNALDATE "1-Jan-2026" RFC822.SIZE 12 MODSEQ (9) BODYSTRUCTURE ("TEXT" "PLAIN" NIL NIL NIL "7BIT" 12 1) ENVELOPE (NIL "Hello" NIL NIL NIL NIL NIL NIL NIL NIL))\r\n${response}`;
			} else if (line.includes('UID COPY')) {
				response = `${tag} OK [COPYUID 7 1 2] copied\r\n`;
			}
			queueMicrotask(() => socket.push(Buffer.from(response)));
			callback();
		},
	});
	queueMicrotask(() => socket.emit('connect'));
	return socket;
}

test('session speaks folder and message protocols through a stream peer', async (t) => {
	const commands: string[] = [];
	t.mock.method(net, 'connect', () => peer(commands));
	syncBuiltinESMExports();
	const config: EmailConfig = {
		imap: { host: 'local', port: 143, tls: false },
		smtp: { host: 'local', port: 587 },
		auth: { user: 'u', pass: 'p' },
	};
	const session = new ImapSession(config);
	try {
		await session.connect();
		assert.ok(session.capabilities.has('MOVE'));
		assert.equal(session.extensions.qresync, true);
		assert.equal((await session.listFolders()).length, 2);
		assert.equal((await session.selectFolder('INBOX')).uidValidity, 7);
		assert.equal(session.selectedFolder, 'INBOX');
		assert.equal((await session.examineFolder('INBOX')).exists, 2);
		assert.equal((await session.statusFolder('INBOX')).messages, 2);
		for (const operation of [
			() => session.createFolder('A'),
			() => session.renameFolder('A', 'B'),
			() => session.subscribeFolder('B'),
			() => session.unsubscribeFolder('B'),
			() => session.deleteFolder('B'),
		])
			await operation();
		const fetched = await session.fetchMessages('1', ['UID', 'FLAGS', 'ENVELOPE', 'BODYSTRUCTURE']);
		assert.equal(fetched[0]?.uid, 1);
		assert.equal(fetched[0]?.modSeq, 9);
		assert.equal(fetched[0]?.envelope?.subject, 'Hello');
		assert.deepEqual(await session.searchMessages('ALL'), [1, 2]);
		await session.storeFlags([1], '+FLAGS.SILENT', ['\\Seen']);
		assert.ok((await session.copyMessages([1], 'B')).uidMapping);
		await session.moveMessages([1], 'B');
		await session.expunge();
		await session.uidExpunge([1]);
		assert.equal(
			(await session.appendMessage('Drafts', Buffer.from('raw'), ['\\Draft'], '1-Jan-2026')).uid,
			88,
		);
		assert.ok(commands.some((line) => line.includes('ENABLE QRESYNC')));
	} finally {
		await session.disconnect();
		t.mock.restoreAll();
		syncBuiltinESMExports();
	}
	assert.throws(() => session.dispatcher, /not connected/);
});

test('Mailbox creates all surfaces and releases them on disconnect', async (t) => {
	t.mock.method(net, 'connect', () => peer([]));
	syncBuiltinESMExports();
	const mailbox = new Mailbox({
		imap: { host: 'local', port: 143, tls: false },
		smtp: { host: 'local', port: 587 },
		auth: { mechanism: 'EXTERNAL', credentials: { username: 'u' } },
	});
	try {
		await mailbox.connect();
		assert.equal(mailbox.isConnected(), true);
		assert.equal(mailbox.read.folders().length, 0);
		assert.ok(mailbox.write);
		assert.equal((await mailbox.network.refreshFolders()).length, 2);
	} finally {
		await mailbox.disconnect();
		t.mock.restoreAll();
		syncBuiltinESMExports();
	}
	assert.equal(mailbox.isConnected(), false);
	assert.throws(() => mailbox.network, /not connected/);
});
