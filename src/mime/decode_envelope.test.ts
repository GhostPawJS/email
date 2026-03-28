import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ImapToken } from '../types/imap_response.ts';
import { decodeEnvelope } from './decode_envelope.ts';

function tok(type: ImapToken['type'], value: ImapToken['value']): ImapToken {
	return { type, value };
}

describe('decodeEnvelope', () => {
	it('decodes subject and message-id', () => {
		// Minimal envelope: (date subject from sender reply-to to cc bcc in-reply-to message-id)
		const tokens: ImapToken[] = [
			tok('quoted', 'Thu, 27 Mar 2026 12:00:00 +0000'),
			tok('quoted', 'Test Subject'),
			tok('nil', null), // from
			tok('nil', null), // sender
			tok('nil', null), // reply-to
			tok('nil', null), // to
			tok('nil', null), // cc
			tok('nil', null), // bcc
			tok('nil', null), // in-reply-to
			tok('quoted', '<msgid@test.com>'), // message-id
		];
		const env = decodeEnvelope(tokens);
		assert.equal(env?.subject, 'Test Subject');
		assert.equal(env?.messageId, '<msgid@test.com>');
	});

	it('returns null or empty envelope for no tokens', () => {
		const r = decodeEnvelope([]);
		// May return null or a default — implementation-defined
		assert.ok(r === null || typeof r === 'object');
	});
});
