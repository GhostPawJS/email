import { defineEmailSkill } from './skill_types.ts';

export const composeAndSendSkill = defineEmailSkill({
	name: 'compose-and-send',
	description:
		'Full draft lifecycle — save, review, update, then send — plus direct send, reply, and forward with proper threading and forwarded-header blocks.',
	content: `# Compose and Send

Primary tools:
- \`mail_compose\`
- \`mail_read\`
- \`mail_sync\`

Steps:
1. For a new message that needs review before sending, use \`mail_compose { action: "save_draft", input: { to, subject, textPlain, attachments? } }\` to create a draft. Store the returned \`uid\`.
2. Use \`mail_read { view: "message", folder: "Drafts", uid }\` to verify the draft content before sending.
3. To update the draft (correcting body or recipients), use \`mail_compose { action: "update_draft", uid, input: { ... } }\`. The old draft is replaced and a new \`uid\` is returned.
4. When ready to send, use \`mail_compose { action: "send_draft", uid }\`. This runs the full SMTP send, appends the message to the Sent folder, and expunges the draft.
5. For immediate sends without a draft step, use \`mail_compose { action: "send", input }\` directly.
6. For replies, always use \`mail_compose { action: "reply", folder, uid, input: { text } }\` — never plain \`send\`. This sets \`In-Reply-To\`, \`References\`, and prepends the attribution + quoted body automatically.
7. For forwards, use \`mail_compose { action: "forward", folder, uid, input }\`:
   - Inline mode (default): prepends "---------- Forwarded message ----------" header block with From/Date/Subject/To, then the original plaintext body.
   - Attachment mode: wraps the original message as a \`.eml\` attachment.
8. After any successful send, use \`mail_read { view: "queue", folder: "Sent" }\` to verify the copy was appended.

Outcome handling:
- \`save_draft\` returns \`{ uid }\` — use this uid for \`update_draft\` and \`send_draft\`.
- A \`success\` from \`send\`, \`reply\`, \`forward\`, or \`send_draft\` contains a \`messageId\` — this is the SMTP message ID, confirming the message left the server. Delivery to the recipient is async.
- If SMTP fails, the draft is NOT automatically deleted — retry \`send_draft\` after resolving the connection issue.

Failure handling:
- Do not send without at least one \`to\` recipient — the tool will return an error.
- Do not manually set \`In-Reply-To\` or \`References\` headers for replies — use \`action: "reply"\`, which handles threading automatically.
- Do not use \`action: "send"\` for replies; threading headers will be missing, breaking mail client thread views.
- If SMTP fails mid-send (after draft exists), use \`mail_sync { action: "reconnect" }\` to restore the session, then retry \`send_draft\`.
- Do not delete a draft until send returns \`outcome: "success"\` — a failed send must leave the draft intact for retry.`,
});
