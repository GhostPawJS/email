import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { WatchEvent } from './sync.ts';

describe('WatchEvent', () => {
	it('discriminates on type', () => {
		const e1: WatchEvent = { type: 'new', folder: 'INBOX', messages: [] };
		const e2: WatchEvent = {
			type: 'flags',
			folder: 'INBOX',
			uid: 1,
			flags: ['\\Seen'],
		};
		const e3: WatchEvent = { type: 'expunge', folder: 'INBOX', uid: 2 };
		assert.equal(e1.type, 'new');
		assert.equal(e2.type, 'flags');
		assert.equal(e3.type, 'expunge');
	});
});
