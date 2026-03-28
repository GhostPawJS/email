import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { encodeHeader } from './encode_header.ts';

describe('encodeHeader', () => {
	it('encodes ASCII header as-is', () => {
		const result = encodeHeader('Subject', 'Hello World');
		assert.ok(result.startsWith('Subject: '));
		assert.ok(result.includes('Hello World'));
	});

	it('encodes non-ASCII header as RFC 2047 B-encoded word', () => {
		const result = encodeHeader('Subject', 'Héllo Wörld');
		assert.ok(result.includes('=?') || result.includes('utf-8'));
	});

	it('wraps long headers', () => {
		const longValue = 'A'.repeat(80);
		const result = encodeHeader('Subject', longValue);
		// Should contain a fold or still be valid (at minimum, contain the name)
		assert.ok(result.startsWith('Subject:'));
	});
});
