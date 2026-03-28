import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseStructuredHeaders } from './parse_structured_headers.ts';

describe('parseStructuredHeaders', () => {
	it('extracts from address', () => {
		const raw = new Map([['from', ['Alice <alice@example.com>']]]);
		const h = parseStructuredHeaders(raw);
		assert.equal(h.from?.address, 'alice@example.com');
		assert.equal(h.from?.name, 'Alice');
	});

	it('extracts subject with encoded word decoding', () => {
		const raw = new Map([['subject', ['=?utf-8?B?SGVsbG8=?=']]]);
		const h = parseStructuredHeaders(raw);
		assert.equal(h.subject, 'Hello');
	});

	it('extracts content-type', () => {
		const raw = new Map([['content-type', ['text/plain; charset=utf-8']]]);
		const h = parseStructuredHeaders(raw);
		assert.equal(h.contentType?.type, 'text');
		assert.equal(h.contentType?.params.charset, 'utf-8');
	});

	it('handles missing headers gracefully', () => {
		const h = parseStructuredHeaders(new Map());
		assert.equal(h.from, null);
		assert.equal(h.subject, null);
	});
});
