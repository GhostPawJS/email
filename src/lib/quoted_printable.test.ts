import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decodeQP, encodeQP } from './quoted_printable.ts';

describe('quoted_printable', () => {
	it('roundtrips ascii', () => {
		const buf = Buffer.from('hello=world', 'utf8');
		assert.equal(decodeQP(encodeQP(buf)).toString(), buf.toString());
	});
});
