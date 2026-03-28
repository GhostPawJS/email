import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Thread, ThreadMessage } from './thread.ts';

describe('Thread', () => {
	it('constructs a Thread with three messages at varying depth', () => {
		const base = {
			folderId: 1,
			uid: 1,
			messageId: null,
			inReplyTo: null,
			references: [],
			threadId: 't',
			from: null,
			to: [],
			cc: [],
			bcc: [],
			replyTo: null,
			subject: null,
			date: null,
			receivedAt: '2026-03-27T12:00:00.000Z',
			envelopeFrom: null,
			envelopeTo: [],
			flags: [],
			labels: [],
			size: null,
			bodyStructure: null,
			hasAttachments: false,
			modSeq: null,
		};
		const m1: ThreadMessage = { id: 1, ...base, depth: 0 };
		const m2: ThreadMessage = { id: 2, ...base, uid: 2, depth: 1 };
		const m3: ThreadMessage = { id: 3, ...base, uid: 3, depth: 2 };
		const t: Thread = {
			threadId: 't',
			subject: 'S',
			participants: [],
			messageCount: 3,
			unreadCount: 1,
			lastDate: '2026-03-27T12:00:00.000Z',
			messages: [m1, m2, m3],
		};
		assert.equal(t.messages[0]?.depth, 0);
		assert.equal(t.messages[2]?.depth, 2);
	});
});
