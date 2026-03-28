import assert from 'node:assert/strict';

import type { EmailSkill } from './skill_types.ts';

export function expectSkillMentionsTools(skill: EmailSkill, toolNames: string[]): void {
	for (const toolName of toolNames) {
		assert.ok(
			skill.content.includes(`\`${toolName}\``),
			`"${skill.name}": expected content to mention \`${toolName}\``,
		);
	}
}

export function expectSkillHasSections(skill: EmailSkill, sections: string[]): void {
	for (const section of sections) {
		assert.ok(
			skill.content.includes(section),
			`"${skill.name}": expected content to include section "${section}"`,
		);
	}
}

export function expectSkillShape(skill: EmailSkill): void {
	assert.ok(skill.name.length > 0, 'skill must have a name');
	assert.ok(skill.description.length > 0, 'skill must have a description');
	assert.ok(skill.content.length > 100, 'skill content must be substantive (> 100 chars)');
}
