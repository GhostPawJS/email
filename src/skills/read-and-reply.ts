import { defineEmailSkill } from './skill_types.ts';

export const readAndReplySkill = defineEmailSkill({
	name: 'read-and-reply',
	description:
		'Read a message with full thread context, then compose and send a properly-threaded reply with quoted attribution.',
	content: `# Read and Reply

Primary tools:
- \`mail_read\`
- \`mail_search\`
- \`mail_compose\`
- \`mail_organize\`

Steps:
1. Use \`mail_read { view: "message", folder, uid }\` to fetch the full message body. This call fetches on demand if the body is not yet cached locally.
2. If the message references a thread (\`threadId\` is present), use \`mail_read { view: "thread", threadId }\` to read the full conversation history before composing.
3. If you need broader context (e.g. a related subject line from weeks ago), use \`mail_search { query: subjectTerms, folder }\` to find prior related messages.
4. Compose the reply with \`mail_compose { action: "reply", folder, uid, input: { text: "..." } }\`. This automatically:
   - Adds the attribution line ("On <date>, <sender> wrote:").
   - Appends the \`>\`-prefixed quoted original body.
   - Sets \`In-Reply-To\` and \`References\` headers for correct threading.
5. To save a draft first, use \`mail_compose { action: "save_draft", input: { ... } }\` and then \`mail_compose { action: "send_draft", uid }\` when ready.
6. After a successful send, mark the original as answered: \`mail_organize { action: "mark_answered", folder, uids: [uid] }\`.

Outcome handling:
- A \`success\` from \`mail_compose reply\` means the reply was sent via SMTP and a copy was appended to the Sent folder.
- If \`mail_read getMessage\` fails with a body-not-found error, run \`mail_sync { action: "sync", folders: [folder] }\` to pull the body, then retry.
- If the thread has attachments that need review before replying, hand off to \`attachment-workflow\` first.

Failure handling:
- Do not compose a reply without first reading the original body — guessing context leads to incorrect replies.
- Do not use \`mail_compose { action: "send" }\` for replies — always use \`action: "reply"\` so threading headers are set correctly.
- Do not mark as answered until send returns \`outcome: "success"\` — failed sends must not modify the original flag.
- Do not quote the entire thread in a reply to a long thread — the quoted body comes from the immediate original only.`,
});
