import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decodeBase64, encodeBase64, encodeBase64Lines } from './base64.ts';

describe('base64', () => {
	it('roundtrips', () => {
		const buf = Buffer.from([0, 1, 255]);
		assert.deepEqual(decodeBase64(encodeBase64(buf)), buf);
	});

	it('wraps lines', () => {
		const long = Buffer.alloc(80, 97);
		const out = encodeBase64Lines(long, 76);
		assert.ok(out.includes('\r\n'));
	});
});
