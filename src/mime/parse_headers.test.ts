import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseHeaders } from './parse_headers.ts';

describe('parseHeaders', () => {
	it('parses simple header block', () => {
		const block = 'Subject: Hello World\r\nFrom: alice@example.com\r\n';
		const headers = parseHeaders(block);
		assert.equal(headers.get('subject')?.[0], 'Hello World');
		assert.equal(headers.get('from')?.[0], 'alice@example.com');
	});

	it('stores header names in lowercase', () => {
		const headers = parseHeaders('Content-Type: text/plain');
		assert.ok(headers.has('content-type'));
	});

	it('handles multiple values for the same header', () => {
		const block = 'Received: from a\r\nReceived: from b';
		const headers = parseHeaders(block);
		assert.equal(headers.get('received')?.length, 2);
	});

	it('returns empty map for empty input', () => {
		assert.equal(parseHeaders('').size, 0);
	});
});
