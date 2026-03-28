import test from 'node:test';
import {
	expectSkillHasSections,
	expectSkillMentionsTools,
	expectSkillShape,
} from './skill_test_utils.ts';
import { triageInboxSkill } from './triage-inbox.ts';

test('triageInboxSkill has correct shape and content', () => {
	expectSkillShape(triageInboxSkill);
	expectSkillMentionsTools(triageInboxSkill, [
		'mail_sync',
		'mail_read',
		'mail_search',
		'mail_organize',
	]);
	expectSkillHasSections(triageInboxSkill, ['Steps:', 'Outcome handling:', 'Failure handling:']);
});
