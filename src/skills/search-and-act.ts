import { defineEmailSkill } from './skill_types.ts';

export const searchAndActSkill = defineEmailSkill({
	name: 'search-and-act',
	description:
		'Find messages matching criteria (local FTS first, remote IMAP SEARCH as fallback), verify targets, then act — organize, reply, or present.',
	content: `# Search and Act

Primary tools:
- \`mail_search\`
- \`mail_read\`
- \`mail_organize\`
- \`mail_compose\`

Steps:
1. Start with \`mail_search { query, mode: "local" }\` — FTS is fast, works offline, and searches subjects, body text, and sender fields simultaneously.
   - Add \`folder\` to restrict to a specific mailbox.
   - Add \`since\` / \`before\` (ISO date strings) to narrow by date range.
   - Add \`hasAttachments: true\` or \`unreadOnly: true\` for quick filters.
2. If local results are insufficient (too few hits, or you expect newer unsynced mail), upgrade to \`mail_search { query, mode: "remote", folder }\` to run IMAP SEARCH on the server.
   - Remote search requires an active IMAP session — run \`mail_sync { action: "connect" }\` first if not connected.
   - Remote search returns UIDs only — always follow up with \`mail_read { view: "message" }\` to get content.
3. Before acting, use \`mail_read { view: "message", folder, uid }\` on the top candidates to confirm the right messages are targeted — search queries can match multiple threads.
4. Decide action based on what you found:
   - Organize → \`mail_organize\` with the appropriate action (archive, move, star, mark_read, etc.).
   - Reply → hand off to the \`read-and-reply\` skill.
   - Forward → \`mail_compose { action: "forward", folder, uid, input }\`.
   - Present only → return the entity list with subjects and UIDs.

Outcome handling:
- Empty local results do not mean the mail doesn't exist — always try remote search before concluding there are no matches.
- Remote search returns UIDs, not message content; reading before acting is not optional.
- If both local and remote searches return 0 results, the mail genuinely doesn't exist — or the query terms are too specific. Try a broader query.
- FTS queries support stemming and phrase matching; if an exact term fails, try a root word or shorter phrase.

Failure handling:
- Do not act on search results without reading the target first — subject-only matches can mislead.
- Do not run remote search in a loop — one local attempt and one remote attempt is sufficient before widening or abandoning the query.
- If \`mode: "remote"\` fails because there is no active session, surface the connection error and suggest \`connect-and-sync\` first.`,
});
