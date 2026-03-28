import assert from 'node:assert/strict';
import test from 'node:test';

import { getEmailToolByName } from './get_email_tool_by_name.ts';

test('getEmailToolByName returns a tool definition by name', () => {
	assert.equal(getEmailToolByName('mail_read')?.name, 'mail_read');
	assert.equal(getEmailToolByName('mail_sync')?.name, 'mail_sync');
	assert.equal(getEmailToolByName('missing'), undefined);
});
