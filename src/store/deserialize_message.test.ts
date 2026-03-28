import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deserializeMessageRow } from './deserialize_message.ts';

describe('deserializeMessageRow', () => {
	it('parses JSON columns', () => {
		const m = deserializeMessageRow({
			id: 1,
			folder_id: 2,
			uid: 3,
			message_id: '<x@y.com>',
			in_reply_to: null,
			references: '["<a@b.com>"]',
			thread_id: '<x@y.com>',
			subject: 'S',
			from: '{"address":"a@b.com"}',
			to: '[]',
			cc: '[]',
			bcc: '[]',
			reply_to: null,
			date: '2026-03-27T12:00:00.000Z',
			received_at: '2026-03-27T12:00:00.000Z',
			envelope_from: null,
			envelope_to: '[]',
			flags: '[]',
			labels: '[]',
			size: 100,
			body_structure: null,
			has_attachments: 0,
			mod_seq: null,
		});
		assert.equal(m.uid, 3);
		assert.equal(m.references.length, 1);
		assert.equal(m.flags.length, 0);
	});
});
