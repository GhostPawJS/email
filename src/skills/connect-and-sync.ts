import { defineEmailSkill } from './skill_types.ts';

export const connectAndSyncSkill = defineEmailSkill({
	name: 'connect-and-sync',
	description:
		'Establish or restore an IMAP connection, refresh the folder list, and pull new messages — handling first-run vs incremental scenarios.',
	content: `# Connect and Sync

Primary tools:
- \`mail_sync\`
- \`mail_read\`

Steps:
1. Use \`mail_sync { action: "connect" }\` to open the IMAP connection. The session negotiates capabilities, authenticates (LOGIN / PLAIN / XOAUTH2 / OAUTHBEARER), and enables extensions (IDLE, COMPRESS=DEFLATE, CONDSTORE/QRESYNC) automatically.
2. If connect fails, inspect the error message before retrying:
   - Auth error → credentials are wrong; do not retry blindly. Surface the error to the user.
   - Connection refused / timeout → transient network issue; retry once.
3. After a successful connect, use \`mail_sync { action: "refresh_folders" }\` to get the current folder list. This detects new folders, updated role assignments (inbox/sent/drafts/trash/junk/archive), and subscription changes.
4. Run \`mail_sync { action: "sync", bodies: "missing" }\` for normal incremental sync (default). The engine uses QRESYNC when available (flag changes + expunges in one round trip), falling back to UID-based comparison.
   - Use \`bodies: "all"\` only when a full cache rebuild is explicitly needed.
   - Pass \`folders: ["INBOX", "Sent"]\` to restrict to specific folders.
5. After sync, use \`mail_read { view: "folders" }\` to verify the local folder state, then \`mail_read { view: "queue", folder: "INBOX" }\` to surface new messages.
6. For continuous monitoring, \`mail_sync { action: "watch" }\` starts IMAP IDLE over selected folders — this requires a persistent application-layer connection and is not a single-call operation.

Outcome handling:
- \`totalNew > 0\` in the sync result means new messages arrived — run \`mail_read queue\` to surface them.
- \`totalExpunged > 0\` means messages were removed on the server; local state was reconciled automatically.
- A UIDVALIDITY reset (logged in sync result) means the entire folder cache was cleared and a full re-sync ran — this is normal after a server migration or mailbox recreation.
- \`refresh_folders\` returning fewer folders than expected may mean the subscription list changed on the server — check with the account's webmail interface.

Failure handling:
- Do not run \`mail_sync sync\` before \`connect\` succeeds — sync requires an active session.
- Do not retry \`connect\` more than 3 times without inspecting the error — auth failures need credential fixes, not retries.
- If \`refresh_folders\` returns 0 folders, something is wrong with the account — do not proceed to sync.
- If sync is interrupted mid-run, the next incremental sync will resume from the last known MODSEQ/UID — do not run a full sync unless explicitly requested.`,
});
