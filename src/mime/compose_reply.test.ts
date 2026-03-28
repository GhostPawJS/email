import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Address } from '../types/address.ts';
import type { Message, MessageBody } from '../types/message.ts';
import { composeReply } from './compose_reply.ts';

const base: Message & MessageBody = {
	id: 1,
	folderId: 1,
	uid: 1,
	messageId: '<orig@test>',
	inReplyTo: null,
	references: [],
	threadId: null,
	from: { address: 'alice@example.com', name: 'Alice' },
	replyTo: null,
	to: [{ address: 'bob@example.com' }],
	cc: [],
	bcc: [],
	subject: 'Original',
	date: '2026-03-27T12:00:00Z',
	receivedAt: '2026-03-27T12:00:00Z',
	envelopeFrom: null,
	envelopeTo: [],
	flags: [],
	labels: [],
	size: null,
	bodyStructure: null,
	hasAttachments: false,
	modSeq: null,
	textPlain: 'Hello',
	textHtml: null,
};

describe('composeReply', () => {
	it('sets Re: subject', () => {
		const identities: Address[] = [{ address: 'bob@example.com' }];
		const c = composeReply(base, {}, identities);
		assert.ok(c.subject?.startsWith('Re:'));
	});

	it('sets In-Reply-To', () => {
		const c = composeReply(base, {}, [{ address: 'bob@example.com' }]);
		assert.equal(c.inReplyTo, '<orig@test>');
	});

	it('includes original messageId in references', () => {
		const c = composeReply(base, {}, [{ address: 'bob@example.com' }]);
		assert.ok(c.references?.includes('<orig@test>'));
	});

	it('does not double-add Re: prefix', () => {
		const c = composeReply({ ...base, subject: 'Re: Original' }, {}, [
			{ address: 'bob@example.com' },
		]);
		assert.ok(!c.subject?.startsWith('Re: Re:'));
	});

	it('includes attribution line in reply text', () => {
		const c = composeReply(base, { text: 'My answer.' }, [{ address: 'bob@example.com' }]);
		assert.ok(c.text?.includes('wrote:'), 'should have attribution line');
		assert.ok(c.text?.includes('> Hello'), 'should quote original body');
	});

	it('reply text appears before quoted body', () => {
		const c = composeReply(base, { text: 'My answer.' }, [{ address: 'bob@example.com' }]);
		const text = c.text ?? '';
		assert.ok(text.indexOf('My answer.') < text.indexOf('wrote:'));
	});

	it('omits quoted body when no input text is provided', () => {
		const c = composeReply(base, {}, [{ address: 'bob@example.com' }]);
		// No input.text → no automatic quoting; text field stays undefined
		assert.equal(c.text, undefined);
	});

	it('gracefully handles null textPlain in original (empty quote block)', () => {
		const c = composeReply({ ...base, textPlain: null }, { text: 'Hi.' }, [
			{ address: 'bob@example.com' },
		]);
		// Should still produce text with attribution even if body is empty
		assert.ok(c.text?.includes('wrote:'), 'attribution line should appear');
		assert.ok(c.text?.startsWith('Hi.'), 'reply text should come first');
	});

	it('reply-all adds original To/Cc but excludes self', () => {
		const carol = { address: 'carol@example.com' };
		const msg = {
			...base,
			to: [{ address: 'bob@example.com' }, carol],
			cc: [{ address: 'dave@example.com' }],
		};
		const identities: Address[] = [{ address: 'bob@example.com' }];
		const c = composeReply(msg, { replyAll: true }, identities);
		const ccAddrs = c.cc?.map((a) => a.address) ?? [];
		assert.ok(ccAddrs.includes('carol@example.com'), 'carol should be in cc');
		assert.ok(ccAddrs.includes('dave@example.com'), 'dave should be in cc');
		assert.ok(!ccAddrs.includes('bob@example.com'), 'self should be excluded from cc');
	});

	it('attribution line includes display name when available', () => {
		const c = composeReply(base, { text: 'ok' }, [{ address: 'bob@example.com' }]);
		// base.from has name 'Alice'
		assert.ok(c.text?.includes('Alice'), 'display name should appear in attribution');
	});
});
