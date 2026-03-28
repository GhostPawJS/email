import { defineEmailSkill } from './skill_types.ts';

export const recoverFromDisruptionSkill = defineEmailSkill({
	name: 'recover-from-disruption',
	description:
		'Detect and recover from connection loss or IMAP/SMTP failures — reconnect with back-off, re-sync to reconcile state, and handle auth vs transient errors distinctly.',
	content: `# Recover from Disruption

Primary tools:
- \`mail_sync\`
- \`mail_read\`

Steps:
1. When any tool returns \`outcome: "error"\` with a message suggesting a connection problem (e.g. "connection lost", "socket closed", "IMAP session not active"), use \`mail_sync { action: "reconnect" }\` as the first recovery step.
2. \`reconnect\` applies exponential back-off internally: 1s → 2s → 4s → 8s … capped at 30s, up to 5 attempts. Wait for it to resolve before proceeding — do not call it in a loop.
3. After a successful reconnect, run \`mail_sync { action: "sync" }\` to reconcile local state. New messages or flag changes may have arrived during the downtime.
4. Retry the original failed operation once sync completes.
5. If \`reconnect\` exhausts all attempts (returns \`outcome: "error"\`), surface the error clearly: include the account host, the last error message, and suggest checking network connectivity and credentials.
6. If a UIDVALIDITY reset appears in the sync result after reconnecting, explain to the user that the folder's local cache was rebuilt — this is normal after a server migration or maintenance event.

Distinguishing error types:
- **Transient / network errors** (connection refused, timeout, TLS handshake failure) → use \`reconnect\`.
- **Auth errors** (EmailAuthError: invalid credentials, token expired) → do NOT use \`reconnect\`. Surface the auth failure immediately and prompt for credential update / token refresh.
- **Protocol errors** (server-side NO / BAD response to a command) → the session may still be alive; retry the specific command once before reconnecting.
- **SMTP failures** are independent of IMAP — an IMAP reconnect does not fix SMTP. Handle them separately.

Outcome handling:
- \`reconnect\` returning \`success\` means a fresh TCP/TLS connection and re-authentication completed.
- Sync after reconnect returning \`totalNew > 0\` means messages arrived during the disruption — run \`triage-inbox\` to process them.
- If the SMTP session was interrupted mid-send (message partially sent), do not retry automatically — check the Sent folder first to avoid duplicate sends.

Failure handling:
- Do not assume a connection error means invalid credentials — always attempt \`reconnect\` once before asking the user for new credentials.
- Do not queue multiple operations while the session is down — wait for reconnect to succeed before retrying.
- If both IMAP and SMTP fail simultaneously, the problem is likely at the network level, not the credentials.`,
});
