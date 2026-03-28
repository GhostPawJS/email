import { defineEmailSkill } from './skill_types.ts';

export const attachmentWorkflowSkill = defineEmailSkill({
	name: 'attachment-workflow',
	description:
		'Discover, inspect, and fetch email attachments on demand; embed attachments in outbound messages; and export or import full .eml files.',
	content: `# Attachment Workflow

Primary tools:
- \`mail_read\`
- \`mail_compose\`
- \`mail_sync\`

Steps:
1. Use \`mail_read { view: "attachment", folder, uid }\` (without \`partPath\`) to list all attachment metadata for a message. Returns filename, MIME type, size, and \`partPath\` for each attachment. This call is local — no network fetch.
2. Review attachment metadata before deciding what to fetch. For attachments larger than a few MB, confirm intent before fetching binary content.
3. Use \`mail_read { view: "attachment", folder, uid, partPath }\` to fetch the binary content of a specific attachment. If the body is not yet cached, this triggers an on-demand IMAP FETCH for that MIME part.
4. Part paths (\`1\`, \`1.2\`, \`2.1.1\`, etc.) are MIME-tree references. They are stable per-message but server-assigned — always use the \`partPath\` value from the metadata list, never guess.
5. For outbound attachments, include them in the \`ComposeInput.attachments\` array when calling \`mail_compose { action: "send" }\` or \`mail_compose { action: "save_draft" }\`.
6. To export a full message with all attachments as a self-contained file, use \`mail_read { view: "eml", folder, uid }\` to get the raw RFC 2822 bytes as a Buffer.

Outcome handling:
- An empty attachment list (0 entities) means the message has \`hasAttachments: false\` locally, or the body has not been fetched yet. Run \`mail_sync { action: "sync", folders: [folder] }\` to pull the body, then retry.
- If a specific attachment fetch fails, the part may have been stripped by the server or the MIME structure may differ from the stored BODYSTRUCTURE. Try re-fetching the full body first.
- \`attachment.data\` is a raw \`Buffer\` — the application layer is responsible for rendering or saving it; tools return the bytes only.

Failure handling:
- Do not fetch all attachments from a batch of messages speculatively — only fetch binary content when explicitly needed.
- Do not assume \`inline: true\` attachments are unimportant — inline images and signed content use the inline flag.
- If \`getAttachment\` returns stale or empty data, retry after a fresh \`mail_sync\` pass. Part caching is per-UID/partPath.
- For very large attachments (>25MB), the on-demand fetch may time out — inform the user and suggest downloading via webmail instead.`,
});
