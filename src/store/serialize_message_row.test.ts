import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { messageToInsertParams } from './serialize_message_row.ts';

describe('messageToInsertParams', () => {
	it('serializes arrays to JSON strings', () => {
		const p = messageToInsertParams({
			folderId: 1,
			uid: 2,
			messageId: null,
			inReplyTo: null,
			references: ['<a>'],
			threadId: null,
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
			flags: ['\\Seen'],
			labels: [],
			size: null,
			bodyStructure: null,
			hasAttachments: false,
			modSeq: null,
		});
		assert.equal(JSON.parse(p.flags)[0], '\\Seen');
	});
});
