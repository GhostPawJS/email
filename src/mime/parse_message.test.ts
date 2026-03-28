import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseMessage } from './parse_message.ts';

describe('parseMessage', () => {
	it('parses a simple text/plain message', () => {
		const raw = Buffer.from(
			'From: alice@example.com\r\nSubject: Hello\r\nContent-Type: text/plain\r\n\r\nHello body',
		);
		const msg = parseMessage(raw);
		assert.equal(msg.headers.from?.address, 'alice@example.com');
		assert.equal(msg.headers.subject, 'Hello');
		assert.ok(msg.textPlain?.includes('Hello body'));
		assert.equal(msg.textHtml, null);
	});

	it('parses a text/html message', () => {
		const raw = Buffer.from('Content-Type: text/html\r\n\r\n<h1>Hello</h1>');
		const msg = parseMessage(raw);
		assert.ok(msg.textHtml?.includes('<h1>Hello</h1>'));
		assert.equal(msg.textPlain, null);
	});

	it('parses multipart/alternative and extracts both parts', () => {
		const raw = Buffer.from(
			'Content-Type: multipart/alternative; boundary="b"\r\n\r\n' +
				'--b\r\nContent-Type: text/plain\r\n\r\nPlain\r\n' +
				'--b\r\nContent-Type: text/html\r\n\r\n<p>HTML</p>\r\n' +
				'--b--\r\n',
		);
		const msg = parseMessage(raw);
		assert.ok(msg.textPlain?.includes('Plain'));
		assert.ok(msg.textHtml?.includes('<p>HTML</p>'));
	});
});
