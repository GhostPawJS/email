import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decodeContentDisposition } from './decode_content_disposition.ts';

describe('decodeContentDisposition', () => {
	it('parses inline', () => {
		const r = decodeContentDisposition('inline');
		assert.equal(r.type, 'inline');
	});

	it('parses attachment with filename', () => {
		const r = decodeContentDisposition('attachment; filename="report.pdf"');
		assert.equal(r.type, 'attachment');
		assert.equal(r.params.filename, 'report.pdf');
	});

	it('handles missing value', () => {
		const r = decodeContentDisposition('');
		assert.ok(r.type === '' || r.type === 'inline');
	});
});
