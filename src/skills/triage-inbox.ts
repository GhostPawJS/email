import { defineEmailSkill } from './skill_types.ts';

export const triageInboxSkill = defineEmailSkill({
	name: 'triage-inbox',
	description:
		'Process a full inbox from scratch: sync to get latest state, read message queue, selectively fetch bodies for decisions, then bulk-organize by priority.',
	content: `# Triage Inbox

Primary tools:
- \`mail_sync\`
- \`mail_read\`
- \`mail_search\`
- \`mail_organize\`

Steps:
1. Use \`mail_sync { action: "sync" }\` first to pull the latest messages. If the account is not connected, run \`mail_sync { action: "connect" }\` before syncing. If offline, skip sync and continue with local state — note results may be stale.
2. Use \`mail_read { view: "queue", folder: "INBOX", limit: 50 }\` to get the current message list. Add \`unreadOnly: true\` when the inbox is large and only new mail needs attention.
3. Scan subjects and senders from the queue. For messages that need a decision, fetch the full body with \`mail_read { view: "message", folder, uid }\`.
4. For messages that are part of an ongoing thread, use \`mail_read { view: "thread", threadId }\` to see the full conversation before deciding.
5. Categorise each message:
   - Needs a reply → hand off to the \`read-and-reply\` skill.
   - Contains an attachment → hand off to the \`attachment-workflow\` skill.
   - Informational / done → \`mail_organize { action: "archive", folder, uids }\`.
   - Spam / junk → \`mail_organize { action: "junk", folder, uids }\`.
   - Important but deferred → \`mail_organize { action: "star", folder, uids }\`.
6. Apply bulk flag operations before disposition: \`mark_read\` first, then \`archive\`/\`trash\`/\`move\` in separate calls.

Outcome handling:
- If sync returns \`totalNew: 0\`, the inbox is already current — proceed directly to the queue read.
- If a message body fetch is slow or fails, it means the body is not yet cached — run \`mail_sync { action: "sync" }\` with the specific folder, then retry.
- If a thread has many messages, read only the most recent before deciding; fetch earlier messages only when context is explicitly needed.

Failure handling:
- Do not archive without reading when the message is from a known sender with an active thread.
- Do not bulk-trash without confirming the source folder is correct — junk detection and legit mail can look similar.
- Do not triage in one pass if the inbox has more than 50 messages — paginate with \`limit\` and \`offset\` to avoid missing messages.`,
});
