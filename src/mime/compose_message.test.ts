import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { composeMessage } from './compose_message.ts';

describe('composeMessage', () => {
	it('composes a simple text message', () => {
		const buf = composeMessage({
			from: { address: 'alice@example.com', name: 'Alice' },
			to: [{ address: 'bob@example.com' }],
			subject: 'Hello',
			text: 'Hello, Bob!',
		});
		const msg = buf.toString('utf8');
		assert.ok(msg.includes('From:'));
		assert.ok(msg.includes('alice@example.com'));
		assert.ok(msg.includes('To:'));
		assert.ok(msg.includes('bob@example.com'));
		assert.ok(msg.includes('Subject: Hello'));
		assert.ok(msg.includes('Hello, Bob!'));
	});

	it('produces a valid Message-ID', () => {
		const buf = composeMessage({
			from: { address: 'a@b.com' },
			to: [{ address: 'c@d.com' }],
			subject: 'Test',
		});
		assert.ok(buf.toString().includes('Message-ID:'));
	});

	it('generates multipart/mixed when attachments are present', () => {
		const buf = composeMessage({
			from: { address: 'a@b.com' },
			to: [{ address: 'c@d.com' }],
			subject: 'S',
			text: 'body',
			attachments: [
				{ content: Buffer.from('pdf data'), filename: 'doc.pdf', mimeType: 'application/pdf' },
			],
		});
		const msg = buf.toString();
		assert.ok(msg.includes('multipart/mixed'));
	});
});

it('composes optional headers and each body format', () => {
	for (const body of [
		{ html: '<b>hello</b>' },
		{ text: 'hello', html: '<b>hello</b>' },
		{ text: 'hello', attachments: [{ filename: 'a.txt', content: Buffer.from('file') }] },
		{
			text: 'hello',
			html: '<b>hello</b>',
			attachments: [
				{ filename: 'a.txt', content: Buffer.from('file'), inline: true, contentId: 'image' },
			],
		},
	]) {
		const raw = composeMessage({
			to: [{ address: 'to@example.com' }],
			cc: [{ address: 'cc@example.com' }],
			bcc: [{ address: 'bcc@example.com' }],
			subject: 'test',
			inReplyTo: '<original>',
			references: ['<original>'],
			headers: { 'X-Test': 'value' },
			...body,
		}).toString();
		assert.match(raw, /Cc: cc@example.com/);
		assert.match(raw, /Bcc: bcc@example.com/);
		assert.match(raw, /In-Reply-To: <original>/);
		assert.match(raw, /References: <original>/);
		assert.match(raw, /X-Test: value/);
		assert.match(raw, /hello/);
		if ('attachments' in body) assert.match(raw, /filename="a.txt"/);
		else assert.match(raw, /text\/html/);
	}
});

it('brackets threading IDs exactly once', () => {
	const raw = composeMessage({
		to: [],
		subject: 'reply',
		inReplyTo: 'parent@host',
		references: ['root@host', '<parent@host>'],
	}).toString();
	assert.match(raw, /In-Reply-To: <parent@host>\r\n/);
	assert.match(raw, /References: <root@host> <parent@host>\r\n/);
});
it('keeps single-part MIME headers in the header block', () => {
	for (const body of [{ text: 'hello' }, { html: '<b>hello</b>' }]) {
		const raw = composeMessage({ to: [], subject: 'test', ...body }).toString();
		const separator = raw.indexOf('\r\n\r\n');
		assert.match(
			raw.slice(0, separator),
			/Content-Type: text\/(plain|html); charset=utf-8\r\nContent-Transfer-Encoding: 7bit$/,
		);
		assert.equal(raw.slice(separator + 4), body.text ?? body.html);
	}
});
