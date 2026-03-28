import test from 'node:test';

import { searchAndActSkill } from './search-and-act.ts';
import {
	expectSkillHasSections,
	expectSkillMentionsTools,
	expectSkillShape,
} from './skill_test_utils.ts';

test('searchAndActSkill has correct shape and content', () => {
	expectSkillShape(searchAndActSkill);
	expectSkillMentionsTools(searchAndActSkill, [
		'mail_search',
		'mail_read',
		'mail_organize',
		'mail_compose',
	]);
	expectSkillHasSections(searchAndActSkill, ['Steps:', 'Outcome handling:', 'Failure handling:']);
});
