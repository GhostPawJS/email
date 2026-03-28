import assert from 'node:assert/strict';
import test from 'node:test';

import * as tools from './index.ts';

test('tools index re-exports the tool registry surface', () => {
	assert.equal(typeof tools.getEmailToolByName, 'function');
	assert.equal(Array.isArray(tools.emailTools), true);
});
