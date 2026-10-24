import assert from 'node:assert/strict';
import { syncBuiltinESMExports } from 'node:module';
import net from 'node:net';
import { Duplex } from 'node:stream';
import test from 'node:test';
import { smtpAuthenticate } from './auth.ts';
import type { SmtpConnection } from './connection.ts';
import { smtpSend } from './send_flow.ts';
import { sendSmtpMessage } from './send_message.ts';

function smtpPeer(lines: string[]): Duplex {
	let data = false;
	const socket = new Duplex({
		read() {},
		write(chunk, _encoding, callback) {
			const line = chunk.toString().trim();
			lines.push(line);
			let response = '250 accepted\r\n';
			if (line.startsWith('EHLO'))
				response = '250-local\r\n250-AUTH PLAIN LOGIN XOAUTH2\r\n250 SIZE 100000\r\n';
			else if (line.startsWith('AUTH')) response = '235 authenticated\r\n';
			else if (line === 'DATA') {
				response = '354 continue\r\n';
				data = true;
			} else if (data) {
				assert.ok(line.endsWith('.'));
				data = false;
			} else if (line === 'QUIT') response = '221 bye\r\n';
			queueMicrotask(() => socket.push(Buffer.from(response)));
			callback();
		},
	});
	queueMicrotask(() => {
		socket.emit('connect');
		socket.push(Buffer.from('220 ready\r\n'));
	});
	return socket;
}

test('SMTP connection negotiates, authenticates and sends dot-stuffed data', async (t) => {
	const lines: string[] = [];
	t.mock.method(net, 'connect', () => smtpPeer(lines));
	syncBuiltinESMExports();
	try {
		await smtpSend(
			{
				imap: { host: 'local', port: 143 },
				smtp: { host: 'local', port: 587, tls: false },
				auth: { user: 'u', pass: 'p' },
			},
			Buffer.from('Subject: Test\n\n.line'),
			{ from: 'a@b', to: ['c@d', 'e@f'] },
		);
		assert.ok(lines.includes('MAIL FROM:<a@b>'));
		assert.ok(lines.includes('RCPT TO:<c@d>'));
		assert.ok(lines.some((line) => line.includes('\r\n..line')));
		assert.equal(lines.at(-1), 'QUIT');
	} finally {
		t.mock.restoreAll();
		syncBuiltinESMExports();
	}
});

test('SMTP authentication covers mechanism selection and rejected credentials', async () => {
	for (const mechanism of ['PLAIN', 'LOGIN', 'XOAUTH2']) {
		for (const code of [235, 535]) {
			const commands: string[] = [];
			const conn = {
				capabilities: new Map([['AUTH', mechanism]]),
				async sendCommand(command: string) {
					commands.push(command);
					return { code, message: 'response' };
				},
			} as unknown as SmtpConnection;
			const config =
				mechanism === 'XOAUTH2' ? { user: 'u', accessToken: 'token' } : { user: 'u', pass: 'p' };
			if (code === 235) await smtpAuthenticate(conn, config);
			else await assert.rejects(smtpAuthenticate(conn, config), /failed/);
			assert.match(commands[0] ?? '', new RegExp(`^AUTH ${mechanism}`));
		}
	}
	const conn = {
		capabilities: new Map(),
		sendCommand: async () => ({ code: 235 }),
	} as unknown as SmtpConnection;
	await assert.rejects(smtpAuthenticate(conn, { user: 'u', accessToken: 't' }), /No OAuth/);
	await assert.rejects(smtpAuthenticate(conn, { mechanism: 'CUSTOM', credentials: {} }), /Unknown/);
});

test('SMTP rejects envelope, recipients, DATA and final response failures', async () => {
	for (const failure of [0, 1, 2, 3]) {
		let call = 0;
		const conn = {
			maxSize: null,
			async sendCommand() {
				const index = call++;
				return { code: index === failure ? 550 : index === 2 ? 354 : 250, message: 'rejected' };
			},
		} as unknown as SmtpConnection;
		await assert.rejects(
			sendSmtpMessage(conn, { from: 'a', to: ['b'] }, Buffer.from('text')),
			/rejected/,
		);
		assert.equal(call, failure + 1);
	}
});
