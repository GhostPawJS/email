import assert from 'node:assert/strict';
import test from 'node:test';

import * as skills from './index.ts';

test('skills index re-exports the skill registry', () => {
	assert.equal(Array.isArray(skills.emailSkills), true);
});
