import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EmailReadSurface } from './surfaces.ts';

describe('EmailReadSurface', () => {
	it('is assignable from a minimal surface', () => {
		const surface: EmailReadSurface = {
			folders: () => [],
			folderStatus: () => ({
				messages: 0,
				unseen: 0,
				uidNext: 1,
				uidValidity: 1,
				highestModSeq: null,
			}),
			messages: () => [],
			threads: () => [],
			getThread: () => ({
				threadId: 't',
				subject: null,
				participants: [],
				messageCount: 0,
				unreadCount: 0,
				lastDate: '',
				messages: [],
			}),
			getMessage: async () => {
				throw new Error('not implemented');
			},
			listAttachments: () => [],
			getAttachment: async () => {
				throw new Error('not implemented');
			},
			search: () => [],
			stats: () => ({
				folders: [],
				totalMessages: 0,
				totalUnread: 0,
				lastSyncedAt: null,
				storageUsed: 0,
			}),
			getDatabase: () => {
				throw new Error('not implemented');
			},
		};
		assert.equal(surface.folders().length, 0);
	});
});
