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

it('round trips mixed Unicode, supplementary characters and ampersands', () => {
	for (const name of ['旅行/日本語', 'Inbox & 📬', '\u0001é終', 'A&B', 'éAé']) {
		assert.equal(decodeMailboxName(encodeMailboxName(name)), name);
	}
	assert.equal(encodeMailboxName('台北'), '&U,BTFw-');
	assert.equal(decodeMailboxName('prefix&unfinished'), 'prefix');
});
