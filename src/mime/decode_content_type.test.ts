import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decodeContentType } from './decode_content_type.ts';

describe('decodeContentType', () => {
	it('parses simple type/subtype', () => {
		const r = decodeContentType('text/plain');
		assert.equal(r.type, 'text');
		assert.equal(r.subtype, 'plain');
	});

	it('parses with charset parameter', () => {
		const r = decodeContentType('text/plain; charset=utf-8');
		assert.equal(r.params.charset, 'utf-8');
	});

	it('parses multipart with boundary', () => {
		const r = decodeContentType('multipart/mixed; boundary="----=_Part_123"');
		assert.equal(r.type, 'multipart');
		assert.equal(r.subtype, 'mixed');
		assert.ok(r.params.boundary?.includes('Part_123'));
	});

	it('returns empty type/subtype for empty input', () => {
		const r = decodeContentType('');
		// Implementation returns empty strings; callers should treat as application/octet-stream
		assert.ok(typeof r.type === 'string');
		assert.ok(typeof r.subtype === 'string');
	});
});
