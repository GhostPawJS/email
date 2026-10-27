import type { EmailDb } from '../database.ts';
import { cliGuide } from '../skills/cli-guide.ts';
import { emailSkills } from '../skills/email_skills.ts';
import type { ToolCliOptions } from '../surfaces/cli.ts';
import { emailVersion } from '../version.ts';
import { emailSurfaceTools } from './email_surface_tools.ts';
export const emailCliOptions: ToolCliOptions<EmailDb> = {
	bin: 'ghostpaw-email',
	version: emailVersion,
	description: 'Email with a local SQLite cache',
	tools: emailSurfaceTools,
	openContext: async (options) => {
		const { openEmailDb } = await import('./open_email_db.ts');
		const { resolveEmailDbPath } = await import('./resolve_email_db_path.ts');
		let path = options.db ?? process.env.GHOSTPAW_EMAIL_DB;
		if (path === undefined) {
			const { resolveAccount, buildEmailConfig } = await import('../cli/account.ts');
			try {
				path = buildEmailConfig(resolveAccount()).storage;
			} catch {
				// No configured account: keep the default database path.
			}
		}
		return openEmailDb(resolveEmailDbPath(path === undefined ? {} : { flag: path }));
	},
	closeContext: (db) => db.close(),
	commands: {
		mcp: async (options) => {
			const { serveEmailMcp } = await import('./serve_email_mcp.ts');
			await serveEmailMcp(options.db === undefined ? {} : { dbPath: options.db });
		},
		skill: async (args = []) => {
			const guides = [...emailSkills, cliGuide];
			if (args[0] === '--help' || args[0] === '-h')
				return 'Usage: ghostpaw-email skill\n       ghostpaw-email skill --list\n       ghostpaw-email skill <guide>\n';
			if (args[0] === '--list')
				return `${guides.map((guide) => `${guide.name}  ${guide.description.replace(/\s+/g, ' ')}`).join('\n')}\n`;
			if (args.length) {
				const guide = guides.find((guide) => guide.name === args[0]);
				if (!guide || args.length !== 1)
					throw new Error(`unknown guide ${args.join(' ')}; run ghostpaw-email skill --list`);
				return guide.content;
			}
			const { renderSkillMarkdown } = await import('../surfaces/skill_markdown.ts');
			const { emailSkillSpec } = await import('./email_skill_spec.ts');
			return renderSkillMarkdown(emailSkillSpec);
		},
	},
};
