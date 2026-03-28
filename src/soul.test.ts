import assert from 'node:assert/strict';
import test from 'node:test';

import { emailSoul, renderEmailSoulPromptFoundation } from './soul.ts';

test('renderEmailSoulPromptFoundation renders the configured soul', () => {
	const rendered = renderEmailSoulPromptFoundation();

	assert.match(rendered, /Mail Steward/);
	assert.match(rendered, /Traits:/);
	assert.equal(emailSoul.slug, 'mail-steward');
});
