import { defineEmailSkill } from './skill_types.ts';

export const organizeBulkSkill = defineEmailSkill({
	name: 'organize-bulk',
	description:
		'Bulk organize messages across folders — flagging, moving, archiving, labelling — and manage the folder hierarchy as part of the flow.',
	content: `# Organize Bulk

Primary tools:
- \`mail_organize\`
- \`mail_search\`
- \`mail_read\`
- \`mail_sync\`

Steps:
1. Always identify the target messages first before acting. Use \`mail_read { view: "queue", folder }\` for recent messages or \`mail_search { query }\` for criteria-based selection. Collect the UIDs.
2. Apply flag operations before disposition:
   - Mark messages as read first: \`mail_organize { action: "mark_read", folder, uids }\`.
   - Then apply bulk disposition: \`archive\`, \`trash\`, \`junk\`, or \`move\`.
3. For moving to a specific folder: \`mail_organize { action: "move", folder, uids, destination }\`. If the destination folder doesn't exist, create it first with \`mail_organize { action: "create_folder", path }\`.
4. For label management (Gmail and compatible IMAP):
   - \`set_labels\` replaces the full label set.
   - \`add_labels\` appends to existing labels.
   - \`remove_labels\` removes specific labels.
   Note: label operations are no-ops on servers without \`XLIST\` or keyword flag support.
5. After any folder creation, rename, or deletion: run \`mail_sync { action: "refresh_folders" }\` to reconcile the local folder cache.
6. For large batches (>50 messages), split UIDs into groups of 50 to stay within IMAP command length limits and avoid timeouts.

Outcome handling:
- \`archive\` / \`trash\` / \`move\` returning \`success\` means the server confirmed the COPY+STORE(\\Deleted)+EXPUNGE sequence completed.
- \`mark_read\` returning \`success\` sets the \`\\Seen\` flag only — it does not move or remove the message.
- Folder creation does not auto-update the local folder list — always follow with \`refresh_folders\`.
- \`junk\` and \`archive\` use server-detected special-use folders — if those roles are not assigned to any folder, the operation falls back to a move to a folder named "Junk" or "Archive" respectively.

Failure handling:
- Do not \`delete_folder\` unless you've confirmed the folder is empty or the intent is to cascade-delete its contents.
- Do not \`move\` to a non-existent folder — create it first, then move.
- Do not bulk-apply \`trash\` to the entire inbox without reading the queue first — irreversible operations need explicit confirmation.
- Do not apply label operations on servers that don't support them; check folder capabilities or catch the error gracefully.`,
});
