import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Folder, FolderRole } from './folder.ts';

describe('Folder', () => {
	it('constructs with all FolderRole variants including null', () => {
		const roles: FolderRole[] = [
			'inbox',
			'sent',
			'drafts',
			'trash',
			'junk',
			'archive',
			'all',
			'flagged',
			null,
		];
		assert.equal(roles.length, 9);
	});

	it('constructs a full Folder', () => {
		const f: Folder = {
			id: 1,
			accountId: 2,
			path: 'INBOX',
			delimiter: '/',
			role: 'inbox',
			uidValidity: 3,
			uidNext: 100,
			highestModSeq: 500,
			messageCount: 10,
			unseenCount: 2,
			lastSyncedAt: '2026-03-27T12:00:00.000Z',
		};
		assert.equal(f.path, 'INBOX');
		assert.equal(f.role, 'inbox');
	});
});
