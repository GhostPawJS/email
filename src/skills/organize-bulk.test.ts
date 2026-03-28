import test from 'node:test';

import { organizeBulkSkill } from './organize-bulk.ts';
import {
	expectSkillHasSections,
	expectSkillMentionsTools,
	expectSkillShape,
} from './skill_test_utils.ts';

test('organizeBulkSkill has correct shape and content', () => {
	expectSkillShape(organizeBulkSkill);
	expectSkillMentionsTools(organizeBulkSkill, [
		'mail_organize',
		'mail_search',
		'mail_read',
		'mail_sync',
	]);
	expectSkillHasSections(organizeBulkSkill, ['Steps:', 'Outcome handling:', 'Failure handling:']);
});
