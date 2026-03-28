import assert from 'node:assert/strict';
import { Duplex } from 'node:stream';
import { describe, it } from 'node:test';
import { EmailAuthError } from '../errors.ts';
import { authenticate } from './auth.ts';
import { ImapDispatcher } from './dispatcher.ts';
import { createTagGenerator } from './tag_generator.ts';
import { ImapTokenizer } from './tokenizer.ts';

function makeDispatcher(): { dispatcher: ImapDispatcher; respond: (s: string) => void } {
	const socket = new Duplex({
		read() {},
		write(_c, _e, cb) {
			cb();
		},
	});
	const tokenizer = new ImapTokenizer();
	const dispatcher = new ImapDispatcher(socket, tokenizer, createTagGenerator('A'));
	const respond = (s: string) => dispatcher.receive(Buffer.from(s));
	return { dispatcher, respond };
}

describe('authenticate', () => {
	it('LOGIN success', async () => {
		const { dispatcher, respond } = makeDispatcher();
		const caps = new Set(['IMAP4rev1']);
		const p = authenticate(dispatcher, caps, { user: 'u', pass: 'p' });
		respond('A0001 OK Logged in\r\n');
		await assert.doesNotReject(p);
	});

	it('LOGIN failure throws EmailAuthError', async () => {
		const { dispatcher, respond } = makeDispatcher();
		const caps = new Set(['IMAP4rev1']);
		const p = authenticate(dispatcher, caps, { user: 'u', pass: 'bad' });
		respond('A0001 NO Login failed\r\n');
		await assert.rejects(p, EmailAuthError);
	});

	it('PLAIN success', async () => {
		const { dispatcher, respond } = makeDispatcher();
		const caps = new Set(['IMAP4rev1', 'AUTH=PLAIN']);
		const p = authenticate(dispatcher, caps, { user: 'u', pass: 'p' });
		respond('A0001 OK Logged in\r\n');
		await assert.doesNotReject(p);
	});

	it('XOAUTH2 success', async () => {
		const { dispatcher, respond } = makeDispatcher();
		const caps = new Set(['IMAP4rev1', 'AUTH=XOAUTH2']);
		const p = authenticate(dispatcher, caps, {
			user: 'u',
			accessToken: 'tok',
		});
		respond('A0001 OK Logged in\r\n');
		await assert.doesNotReject(p);
	});
});
