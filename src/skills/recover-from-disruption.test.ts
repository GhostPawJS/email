import test from 'node:test';

import { recoverFromDisruptionSkill } from './recover-from-disruption.ts';
import {
	expectSkillHasSections,
	expectSkillMentionsTools,
	expectSkillShape,
} from './skill_test_utils.ts';

test('recoverFromDisruptionSkill has correct shape and content', () => {
	expectSkillShape(recoverFromDisruptionSkill);
	expectSkillMentionsTools(recoverFromDisruptionSkill, ['mail_sync', 'mail_read']);
	expectSkillHasSections(recoverFromDisruptionSkill, [
		'Steps:',
		'Outcome handling:',
		'Failure handling:',
	]);
});
