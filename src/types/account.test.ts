import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Account } from './account.ts';

describe('Account', () => {
	it('constructs an Account', () => {
		const a: Account = {
			id: 1,
			host: 'imap.example.com',
			port: 993,
			username: 'user',
			label: null,
			createdAt: '2026-03-27T12:00:00.000Z',
		};
		assert.equal(a.host, 'imap.example.com');
		assert.equal(a.label, null);
	});
});
