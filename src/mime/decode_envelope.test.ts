import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decodeEnvelope } from './decode_envelope.ts';

/**
 * Tests use the collectItems() output format (plain JS values):
 *   - NIL → null
 *   - quoted/atom → string
 *   - paren group → nested array
 *
 * Address structure: [[personalName, sourceRoute, mailbox, host], ...]
 */

describe('decodeEnvelope', () => {
	it('decodes date, subject and message-id', () => {
		const data = [
			'Thu, 27 Mar 2026 12:00:00 +0000', // date
			'Test Subject', // subject
			null, // from
			null, // sender
			null, // reply-to
			null, // to
			null, // cc
			null, // bcc
			null, // in-reply-to
			'<msgid@test.com>', // message-id
		];
		const env = decodeEnvelope(data);
		assert.equal(env?.subject, 'Test Subject');
		assert.equal(env?.date, 'Thu, 27 Mar 2026 12:00:00 +0000');
		assert.equal(env?.messageId, '<msgid@test.com>');
	});

	it('decodes from address list', () => {
		const from = [['Alice', null, 'alice', 'example.com']];
		const data = [
			'Thu, 27 Mar 2026 12:00:00 +0000',
			'Hello',
			from, // from
			null,
			null,
			null,
			null,
			null,
			null,
			'<id@test>',
		];
		const env = decodeEnvelope(data);
		assert.equal(env.from.length, 1);
		assert.equal(env.from[0]?.address, 'alice@example.com');
		assert.equal(env.from[0]?.name, 'Alice');
	});

	it('handles RFC 2047 encoded words in subject', () => {
		const data = [
			null,
			'=?UTF-8?B?SGVsbG8gV29ybGQ=?=', // "Hello World"
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
		];
		const env = decodeEnvelope(data);
		assert.equal(env.subject, 'Hello World');
	});

	it('handles address with no personal name', () => {
		const from = [[null, null, 'bob', 'example.org']];
		const data = [null, null, from, null, null, null, null, null, null, null];
		const env = decodeEnvelope(data);
		assert.equal(env.from[0]?.address, 'bob@example.org');
		assert.equal(env.from[0]?.name, undefined);
	});

	it('returns empty arrays for null address lists', () => {
		const data = [null, null, null, null, null, null, null, null, null, null];
		const env = decodeEnvelope(data);
		assert.deepEqual(env.from, []);
		assert.deepEqual(env.to, []);
		assert.deepEqual(env.cc, []);
	});

	it('returns sensible defaults for empty input', () => {
		const env = decodeEnvelope([]);
		assert.ok(typeof env === 'object');
		assert.deepEqual(env.from, []);
		assert.equal(env.subject, null);
	});

	it('decodes multiple addresses in a single list', () => {
		const to = [
			['Alice', null, 'alice', 'a.com'],
			['Bob', null, 'bob', 'b.com'],
			[null, null, 'charlie', 'c.com'],
		];
		const data = [null, null, null, null, null, to, null, null, null, null];
		const env = decodeEnvelope(data);
		assert.equal(env.to.length, 3);
		assert.equal(env.to[0]?.address, 'alice@a.com');
		assert.equal(env.to[1]?.name, 'Bob');
		assert.equal(env.to[2]?.address, 'charlie@c.com');
		assert.equal(env.to[2]?.name, undefined);
	});

	it('handles Buffer values as strings', () => {
		const data = [
			Buffer.from('Thu, 27 Mar 2026'),
			Buffer.from('Buffered Subject'),
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			Buffer.from('<buf@test.com>'),
		];
		const env = decodeEnvelope(data);
		assert.equal(env.date, 'Thu, 27 Mar 2026');
		assert.equal(env.subject, 'Buffered Subject');
		assert.equal(env.messageId, '<buf@test.com>');
	});

	it('handles numeric values by coercing to string', () => {
		// Edge case: some IMAP servers return unquoted numbers
		const data = [null, null, null, null, null, null, null, null, null, 12345 as unknown];
		const env = decodeEnvelope(data as unknown[]);
		assert.equal(env.messageId, '12345');
	});

	it('decodes RFC 2047 encoded personal names in addresses', () => {
		const from = [['=?UTF-8?B?SMOpbMOobmU=?=', null, 'helene', 'example.fr']];
		const data = [null, null, from, null, null, null, null, null, null, null];
		const env = decodeEnvelope(data);
		assert.equal(env.from[0]?.name, 'Hélène');
		assert.equal(env.from[0]?.address, 'helene@example.fr');
	});

	it('skips address entries with missing mailbox or host', () => {
		const from = [
			['Valid', null, 'user', 'host.com'],
			['Missing Host', null, 'user', null],
			['Missing Mailbox', null, null, 'host.com'],
		];
		const data = [null, null, from, null, null, null, null, null, null, null];
		const env = decodeEnvelope(data);
		assert.equal(env.from.length, 1);
		assert.equal(env.from[0]?.address, 'user@host.com');
	});

	it('populates all eight address fields independently', () => {
		const mk = (user: string) => [[null, null, user, 'x.com']];
		const data = [
			null,
			null,
			mk('from'),
			mk('sender'),
			mk('reply'),
			mk('to'),
			mk('cc'),
			mk('bcc'),
			'<irt@x>',
			'<mid@x>',
		];
		const env = decodeEnvelope(data);
		assert.equal(env.from[0]?.address, 'from@x.com');
		assert.equal(env.sender[0]?.address, 'sender@x.com');
		assert.equal(env.replyTo[0]?.address, 'reply@x.com');
		assert.equal(env.to[0]?.address, 'to@x.com');
		assert.equal(env.cc[0]?.address, 'cc@x.com');
		assert.equal(env.bcc[0]?.address, 'bcc@x.com');
		assert.equal(env.inReplyTo, '<irt@x>');
		assert.equal(env.messageId, '<mid@x>');
	});
});
