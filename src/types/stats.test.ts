import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AccountStats } from './stats.ts';

describe('AccountStats', () => {
	it('constructs AccountStats', () => {
		const s: AccountStats = {
			folders: [{ path: 'INBOX', role: 'inbox', total: 1, unread: 0 }],
			totalMessages: 1,
			totalUnread: 0,
			lastSyncedAt: null,
			storageUsed: 4096,
		};
		assert.equal(s.totalMessages, 1);
	});
});
