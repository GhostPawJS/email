import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decodeTransferEncoding } from './decode_transfer_encoding.ts';

describe('decodeTransferEncoding', () => {
	it('decodes base64', () => {
		const buf = Buffer.from('SGVsbG8gV29ybGQ=', 'ascii');
		assert.equal(decodeTransferEncoding(buf, 'base64').toString(), 'Hello World');
	});

	it('decodes quoted-printable', () => {
		const buf = Buffer.from('Hello=20World', 'ascii');
		assert.equal(decodeTransferEncoding(buf, 'quoted-printable').toString(), 'Hello World');
	});

	it('passes 7bit through unchanged', () => {
		const buf = Buffer.from('plain text');
		assert.equal(decodeTransferEncoding(buf, '7bit').toString(), 'plain text');
	});

	it('passes 8bit through unchanged', () => {
		const buf = Buffer.from('plain text');
		assert.equal(decodeTransferEncoding(buf, '8bit').toString(), 'plain text');
	});
});
