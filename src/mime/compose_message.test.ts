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
