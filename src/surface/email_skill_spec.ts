import { emailSkills } from '../skills/email_skills.ts';
import { emailMcpInstructions } from './email_mcp_instructions.ts';
import { emailSurfaceTools } from './email_surface_tools.ts';
export const emailSkillSpec = {
	name: 'email',
	description:
		'Read, search, compose, organize and synchronize email with a local SQLite cache. Use when managing email or searching cached messages.',
	license: 'MIT',
	compatibility:
		'Release binary ghostpaw-email (no runtime needed); MCP stdio via ghostpaw-email mcp.',
	bin: 'ghostpaw-email',
	packageName: '@ghostpaw/email',
	server: 'ghostpaw-email',
	about: `${emailMcpInstructions}

## Running inside sandboxed agent harnesses

Inside a Codex CLI \`--sandbox workspace-write\` session, the database and its
parent directory must be inside a writable root, including SQLite's \`-wal\` and
\`-shm\` side files. A default DB under \`~/.ghostpaw\` outside those roots can fail
with \`SQLITE_CANTOPEN\` or \`EPERM\` (often exit 70; directory creation failures
may exit 2), even when normal shell permissions allow access. Put the DB inside the workspace with \`--db ./state/email.db\`,
or set \`GHOSTPAW_EMAIL_DB="$PWD/state/email.db"\` for CLI/MCP use.

To use an external DB directory, add it when starting the OpenAI Codex CLI
(replace \`<dir-with-db>\` with its absolute path):

\`\`\`sh
codex exec --sandbox workspace-write --add-dir <dir-with-db> "Run the GhostPaw CLI"
\`\`\`

Alternatively, set \`sandbox_workspace_write.writable_roots\` in
\`~/.codex/config.toml\` before starting the session:

\`\`\`toml
[sandbox_workspace_write]
writable_roots = ["/absolute/dir-with-db"]
\`\`\`
`,
	tools: emailSurfaceTools,
	workflows: [...emailSkills, { name: 'cli', description: 'Complete existing email CLI guide.' }],
	principles: [
		'Inspect before changing messages.',
		'Confirm recipients and content before sending.',
	],
};
