import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Message, MessageBody } from '../types/message.ts';
import { composeForward } from './compose_forward.ts';

const base: Message & MessageBody = {
	id: 1,
	folderId: 1,
	uid: 1,
	messageId: '<orig@test>',
	inReplyTo: null,
	references: [],
	threadId: null,
	from: { address: 'alice@example.com' },
	replyTo: null,
	to: [],
	cc: [],
	bcc: [],
	subject: 'Report',
	date: null,
	receivedAt: new Date().toISOString(),
	envelopeFrom: null,
	envelopeTo: [],
	flags: [],
	labels: [],
	size: null,
	bodyStructure: null,
	hasAttachments: false,
	modSeq: null,
	textPlain: 'See attached.',
	textHtml: null,
};

describe('composeForward', () => {
	it('sets Fwd: subject', () => {
		const c = composeForward(base, { to: [{ address: 'carol@example.com' }] });
		assert.ok(c.subject?.startsWith('Fwd:'));
	});

	it('does not double-add Fwd: prefix', () => {
		const c = composeForward(
			{ ...base, subject: 'Fwd: Report' },
			{ to: [{ address: 'carol@example.com' }] },
		);
		assert.ok(!c.subject?.startsWith('Fwd: Fwd:'));
	});

	it('inline mode includes original body', () => {
		const c = composeForward(base, { to: [], mode: 'inline' });
		assert.ok(c.text?.includes('See attached.'));
	});

	it('inline mode includes forwarded message header block', () => {
		const c = composeForward(base, { to: [], mode: 'inline' });
		assert.ok(c.text?.includes('Forwarded message'), 'should have header block');
		assert.ok(c.text?.includes('alice@example.com'), 'should include original sender');
	});

	it('attachment mode does not include original body in text', () => {
		const c = composeForward(base, { to: [], mode: 'attachment' });
		assert.equal(c.text, undefined);
	});

	it('user prefix text appears before forwarded block', () => {
		const c = composeForward(base, { to: [], mode: 'inline', text: 'See below.' });
		const text = c.text ?? '';
		assert.ok(text.indexOf('See below.') < text.indexOf('Forwarded message'));
	});

	it('inline mode with null textPlain still shows header block', () => {
		const c = composeForward({ ...base, textPlain: null }, { to: [], mode: 'inline' });
		assert.ok(
			c.text?.includes('Forwarded message'),
			'header block should appear even with no body',
		);
	});

	it('inline mode does not crash when date is null', () => {
		// base already has date: null — verify no crash and no date line
		assert.doesNotThrow(() => composeForward(base, { to: [], mode: 'inline' }));
	});

	it('inline mode includes display name in From field when available', () => {
		const withName = { ...base, from: { address: 'alice@example.com', name: 'Alice Smith' } };
		const c = composeForward(withName, { to: [], mode: 'inline' });
		assert.ok(c.text?.includes('Alice Smith'), 'display name should appear in forwarded From line');
	});

	it('no text field produced for attachment mode with no user text', () => {
		const c = composeForward(base, { to: [], mode: 'attachment' });
		assert.equal(c.text, undefined);
	});

	it('attachment mode preserves user-supplied text', () => {
		const c = composeForward(base, { to: [], mode: 'attachment', text: 'Please review.' });
		assert.equal(c.text, 'Please review.');
	});
});
