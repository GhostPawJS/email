import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Message } from './message.ts';

describe('Message', () => {
	it('constructs a full Message', () => {
		const m: Message = {
			id: 1,
			folderId: 2,
			uid: 42,
			messageId: '<id@example.com>',
			inReplyTo: null,
			references: [],
			threadId: '<id@example.com>',
			from: { address: 'a@b.com' },
			to: [{ address: 'c@d.com' }],
			cc: [],
			bcc: [],
			replyTo: null,
			subject: 'Hi',
			date: '2026-03-27T12:00:00.000Z',
			receivedAt: '2026-03-27T12:00:00.000Z',
			envelopeFrom: null,
			envelopeTo: [],
			flags: ['\\Seen'],
			labels: [],
			size: 100,
			bodyStructure: null,
			hasAttachments: false,
			modSeq: null,
		};
		assert.equal(m.hasAttachments, false);
		assert.equal(m.flags.includes('\\Seen'), true);
	});
});
