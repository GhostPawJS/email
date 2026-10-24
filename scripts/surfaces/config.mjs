import { readFileSync } from 'node:fs';
import { emailSkills } from '../../src/skills/email_skills.ts';
import { emailSkillSpec } from '../../src/surface/email_skill_spec.ts';
import { emailSurfaceTools } from '../../src/surface/email_surface_tools.ts';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
export const config = {
	slug: 'email',
	skill: emailSkillSpec,
	workflows: [
		...emailSkills,
		{
			name: 'cli',
			description: 'Complete existing email CLI guide.',
			content: readFileSync(
				new URL('../../skills/email/references/cli.md', import.meta.url),
				'utf8',
			),
		},
	],
	manifest: {
		name: 'ghostpaw-email',
		version: pkg.version,
		description: 'Email tools with a local SQLite cache and IMAP/SMTP account configuration.',
		author: pkg.author,
		homepage: pkg.homepage,
		repository: pkg.repository.url,
		license: pkg.license,
		keywords: pkg.keywords,
		server: 'ghostpaw-email',
		packageName: pkg.name,
		mcpName: 'io.github.GhostPawJS/email',
		title: 'GhostPaw Email',
		websiteUrl: pkg.homepage,
		environment: [
			{
				name: 'GHOSTPAW_EMAIL_DB',
				description: 'SQLite database path (default: ~/.ghostpaw/email.db)',
			},
		],
	},
};

export const mcpbSpec = {
	...config.manifest,
	longDescription:
		'Read, search and manage email with a local SQLite cache. Configure network accounts using email account add.',
	documentation: 'https://github.com/GhostPawJS/email/blob/main/README.md',
	support: pkg.bugs.url,
	entryPoint: 'server/mcp-server.js',
	env: { GHOSTPAW_EMAIL_DB: `\${user_config.db_path}` },
	userConfig: {
		db_path: {
			type: 'string',
			title: 'Database path',
			description: 'Path to the local SQLite database.',
			required: false,
			default: `\${HOME}/.ghostpaw/email.db`,
		},
	},
	tools: emailSurfaceTools.map(({ name, description }) => ({ name, description })),
};
