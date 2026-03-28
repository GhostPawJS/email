import { attachmentWorkflowSkill } from './attachment-workflow.ts';
import { composeAndSendSkill } from './compose-and-send.ts';
import { connectAndSyncSkill } from './connect-and-sync.ts';
import { organizeBulkSkill } from './organize-bulk.ts';
import { readAndReplySkill } from './read-and-reply.ts';
import { recoverFromDisruptionSkill } from './recover-from-disruption.ts';
import { searchAndActSkill } from './search-and-act.ts';
import type { EmailSkillRegistry } from './skill_types.ts';
import { triageInboxSkill } from './triage-inbox.ts';

export const emailSkills = [
	triageInboxSkill,
	readAndReplySkill,
	connectAndSyncSkill,
	searchAndActSkill,
	composeAndSendSkill,
	organizeBulkSkill,
	attachmentWorkflowSkill,
	recoverFromDisruptionSkill,
] satisfies EmailSkillRegistry;

export function getEmailSkillByName(name: string): (typeof emailSkills)[number] | null {
	return emailSkills.find((skill) => skill.name === name) ?? null;
}
