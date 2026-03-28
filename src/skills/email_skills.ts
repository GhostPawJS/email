import type { EmailSkill } from './skill_types.ts';

export const emailSkills = [
	{
		name: 'triage_inbox',
		description: 'Review local inbox messages, then decide what needs sync, reply, or archival.',
		steps: [
			'Review current mailbox and message surfaces first.',
			'Search for the relevant thread or subject.',
			'Choose whether the next action is sync, reply, or local organization.',
		],
	},
	{
		name: 'reply_to_message',
		description: 'Prepare and send a small outbound reply through the SMTP facade.',
		steps: [
			'Inspect the local message context before drafting.',
			'Compose the smallest useful reply body.',
			'Send through the SMTP transport and record follow-up work if needed.',
		],
	},
	{
		name: 'sync_mailbox',
		description: 'Refresh local mailbox state from the IMAP transport facade.',
		steps: [
			'Confirm the target account and mailbox scope.',
			'Queue a sync job and run the IMAP sync surface.',
			'Inspect resulting local state for next actions.',
		],
	},
] satisfies readonly EmailSkill[];
