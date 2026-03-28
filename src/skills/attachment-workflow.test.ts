import test from 'node:test';

import { attachmentWorkflowSkill } from './attachment-workflow.ts';
import {
	expectSkillHasSections,
	expectSkillMentionsTools,
	expectSkillShape,
} from './skill_test_utils.ts';

test('attachmentWorkflowSkill has correct shape and content', () => {
	expectSkillShape(attachmentWorkflowSkill);
	expectSkillMentionsTools(attachmentWorkflowSkill, ['mail_read', 'mail_compose', 'mail_sync']);
	expectSkillHasSections(attachmentWorkflowSkill, [
		'Steps:',
		'Outcome handling:',
		'Failure handling:',
	]);
});
