import assert from 'node:assert/strict';
import test from 'node:test';
import { emailTools, getEmailToolByName, listEmailToolDefinitions } from './aligned.ts';
import { emailTools as legacy } from './email_tools.ts';
import type { EmailToolContext } from './tool_metadata.ts';

const inputs = [
	{ view: 'folders' },
	{ query: 'hello' },
	{ action: 'send', input: { to: [{ address: 'reader@example.com' }], subject: 'Hello' } },
	{ action: 'mark_read', folder: 'INBOX', uids: [1] },
	{ action: 'connect' },
];
for (const [index, tool] of emailTools.entries()) {
	test(`${tool.name} adapts metadata and success/error results`, async () => {
		assert.equal(tool.inputSchema, legacy[index]?.inputSchema);
		assert.equal(tool.inputSchema.type, 'object');
		assert.ok(tool.whenToUse);
		assert.ok(tool.whenNotToUse);
		assert.equal(tool.readOnly, false);
		assert.equal(tool.sideEffects, 'writes_state');
		const ctx = {
			read: { folders: () => [], search: () => [] },
			write: { send: async () => ({ messageId: 'sent' }), markRead: async () => {} },
			network: { connect: async () => {} },
		} as unknown as EmailToolContext;
		const result = await tool.handler(ctx, inputs[index]);
		assert.equal(result.ok, true);
		assert.equal(result.outcome, 'success');
		assert.ok(result.summary);
		assert.ok(Array.isArray(result.data.entities));
		assert.ok(Array.isArray(result.next));
		const broken = new Proxy(
			{},
			{
				get() {
					throw new Error('unavailable');
				},
			},
		);
		const failure = await tool.handler(broken as EmailToolContext, inputs[index]);
		assert.equal(failure.ok, false);
		assert.equal(failure.outcome, 'error');
		assert.match(failure.summary, /unavailable/);
	});
}

test('registry returns a copy and resolves names', () => {
	const listed = listEmailToolDefinitions();
	assert.deepEqual(listed, emailTools);
	listed.pop();
	assert.equal(emailTools.length, 5);
	assert.equal(getEmailToolByName('mail_read'), emailTools[0]);
	assert.equal(getEmailToolByName('missing'), null);
});
