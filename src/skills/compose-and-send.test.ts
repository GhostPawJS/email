import test from 'node:test';

import { composeAndSendSkill } from './compose-and-send.ts';
import {
	expectSkillHasSections,
	expectSkillMentionsTools,
	expectSkillShape,
} from './skill_test_utils.ts';

test('composeAndSendSkill has correct shape and content', () => {
	expectSkillShape(composeAndSendSkill);
	expectSkillMentionsTools(composeAndSendSkill, ['mail_compose', 'mail_read', 'mail_sync']);
	expectSkillHasSections(composeAndSendSkill, ['Steps:', 'Outcome handling:', 'Failure handling:']);
});
