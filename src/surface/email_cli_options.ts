import type { EmailDb } from '../database.ts';
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
		skill: async () => {
			const { renderSkillMarkdown } = await import('../surfaces/skill_markdown.ts');
			const { emailSkillSpec } = await import('./email_skill_spec.ts');
			return renderSkillMarkdown(emailSkillSpec);
		},
	},
};
