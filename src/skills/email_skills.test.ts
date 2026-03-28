import assert from 'node:assert/strict';
import test from 'node:test';

import { emailSkills, getEmailSkillByName } from './email_skills.ts';

test('emailSkills registry contains exactly 8 skills', () => {
	assert.equal(emailSkills.length, 8);
});

test('emailSkills registry has correct skill names in order', () => {
	const names = emailSkills.map((s) => s.name);
	assert.deepEqual(names, [
		'triage-inbox',
		'read-and-reply',
		'connect-and-sync',
		'search-and-act',
		'compose-and-send',
		'organize-bulk',
		'attachment-workflow',
		'recover-from-disruption',
	]);
});

test('getEmailSkillByName returns the correct skill', () => {
	const skill = getEmailSkillByName('triage-inbox');
	assert.ok(skill !== null);
	assert.equal(skill.name, 'triage-inbox');
});

test('getEmailSkillByName returns null for unknown names', () => {
	assert.equal(getEmailSkillByName('nonexistent'), null);
});

test('every skill has name, description, and substantive content', () => {
	for (const skill of emailSkills) {
		assert.ok(skill.name.length > 0, `${skill.name}: missing name`);
		assert.ok(skill.description.length > 0, `${skill.name}: missing description`);
		assert.ok(skill.content.length > 100, `${skill.name}: content is too short`);
		assert.ok(skill.content.includes('Steps:'), `${skill.name}: content must include Steps:`);
		assert.ok(
			skill.content.includes('Outcome handling:'),
			`${skill.name}: content must include Outcome handling:`,
		);
		assert.ok(
			skill.content.includes('Failure handling:'),
			`${skill.name}: content must include Failure handling:`,
		);
	}
});
