import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ComposeInput, ForwardInput, ReplyInput } from './compose.ts';

describe('compose types', () => {
	it('constructs ComposeInput, ReplyInput, ForwardInput', () => {
		const c: ComposeInput = {
			from: { address: 'a@b.com' },
			to: [{ address: 'c@d.com' }],
			subject: 'S',
		};
		const r: ReplyInput = { replyAll: true };
		const f: ForwardInput = { to: [{ address: 'e@f.com' }], mode: 'inline' };
		assert.equal(c.subject, 'S');
		assert.equal(r.replyAll, true);
		assert.equal(f.mode, 'inline');
	});
});
