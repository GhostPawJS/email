import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decodeMailboxName, encodeMailboxName } from './mutf7.ts';

describe('mutf7', () => {
	it('roundtrips ASCII', () => {
		const s = 'INBOX';
		assert.equal(decodeMailboxName(encodeMailboxName(s)), s);
	});

	it('handles ampersand escape', () => {
		const s = 'Sent & Trash';
		assert.equal(encodeMailboxName(s), 'Sent &- Trash');
		assert.equal(decodeMailboxName('Sent &- Trash'), s);
	});
});
