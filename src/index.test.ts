import assert from 'node:assert/strict';
import test from 'node:test';

import * as email from './index.ts';

test('root index exposes the family-style package surface', () => {
	assert.equal(typeof email.initSchema, 'function');
	assert.equal(typeof email.Mailbox, 'function');
	assert.equal(typeof email.read.createReadSurface, 'function');
	assert.equal(typeof email.write.createWriteSurface, 'function');
	assert.equal(typeof email.runtime.init, 'function');
	assert.equal(typeof email.soul.renderEmailSoulPromptFoundation, 'function');
	assert.equal(typeof email.tools.getEmailToolByName, 'function');
	assert.equal(typeof email.skills.emailSkills, 'object');
});
