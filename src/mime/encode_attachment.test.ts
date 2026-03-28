import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { encodeAttachment } from './encode_attachment.ts';

describe('encodeAttachment', () => {
	it('encodes a buffer as base64 MIME part', () => {
		const data = Buffer.from('Hello attachment');
		const result = encodeAttachment({
			content: data,
			filename: 'hello.txt',
			mimeType: 'text/plain',
		});
		assert.ok(result.includes('Content-Type: text/plain'));
		assert.ok(result.includes('Content-Disposition: attachment'));
		assert.ok(result.includes('hello.txt'));
		assert.ok(result.includes('Content-Transfer-Encoding: base64'));
	});
});
