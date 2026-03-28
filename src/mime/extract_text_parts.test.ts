import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractTextParts } from './extract_text_parts.ts';
import { parseMultipart } from './parse_multipart.ts';

describe('extractTextParts', () => {
	it('extracts text/plain from multipart', () => {
		const body = Buffer.from('--b\r\nContent-Type: text/plain\r\n\r\nHello plain\r\n--b--\r\n');
		const parts = parseMultipart(body, 'b');
		const { textPlain } = extractTextParts(parts);
		assert.ok(textPlain?.includes('Hello plain'));
	});

	it('extracts text/html from multipart', () => {
		const body = Buffer.from('--b\r\nContent-Type: text/html\r\n\r\n<p>hi</p>\r\n--b--\r\n');
		const parts = parseMultipart(body, 'b');
		const { textHtml } = extractTextParts(parts);
		assert.ok(textHtml?.includes('<p>hi</p>'));
	});

	it('returns nulls when no text parts', () => {
		const { textPlain, textHtml } = extractTextParts([]);
		assert.equal(textPlain, null);
		assert.equal(textHtml, null);
	});
});
