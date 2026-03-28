import test from 'node:test';

import { readAndReplySkill } from './read-and-reply.ts';
import {
	expectSkillHasSections,
	expectSkillMentionsTools,
	expectSkillShape,
} from './skill_test_utils.ts';

test('readAndReplySkill has correct shape and content', () => {
	expectSkillShape(readAndReplySkill);
	expectSkillMentionsTools(readAndReplySkill, [
		'mail_read',
		'mail_search',
		'mail_compose',
		'mail_organize',
	]);
	expectSkillHasSections(readAndReplySkill, ['Steps:', 'Outcome handling:', 'Failure handling:']);
});
