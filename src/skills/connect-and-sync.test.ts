import test from 'node:test';

import { connectAndSyncSkill } from './connect-and-sync.ts';
import {
	expectSkillHasSections,
	expectSkillMentionsTools,
	expectSkillShape,
} from './skill_test_utils.ts';

test('connectAndSyncSkill has correct shape and content', () => {
	expectSkillShape(connectAndSyncSkill);
	expectSkillMentionsTools(connectAndSyncSkill, ['mail_sync', 'mail_read']);
	expectSkillHasSections(connectAndSyncSkill, ['Steps:', 'Outcome handling:', 'Failure handling:']);
});
