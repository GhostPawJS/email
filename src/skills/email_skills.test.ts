import assert from 'node:assert/strict';
import test from 'node:test';

import { emailSkills } from './email_skills.ts';

test('emailSkills exposes reusable workflow guidance', () => {
	assert.equal(emailSkills.length, 3);
	assert.equal(emailSkills[0]?.name, 'triage_inbox');
	assert.equal(emailSkills[1]?.steps.length, 3);
});
