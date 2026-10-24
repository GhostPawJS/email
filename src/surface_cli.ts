import { emailSurfaceTools } from './surface/email_surface_tools.ts';
import { runToolCli } from './surfaces/cli.ts';
import { emailVersion } from './version.ts';

process.exitCode = await runToolCli(process.argv.slice(2), {
	bin: 'ghostpaw-email',
	version: emailVersion,
	description: 'Local belief and memory engine',
	tools: emailSurfaceTools,
	openContext: async (options) => {
		const { openEmailDb } = await import('./surface/open_email_db.ts');
		const { resolveEmailDbPath } = await import('./surface/resolve_email_db_path.ts');
		return openEmailDb(resolveEmailDbPath(options.db === undefined ? {} : { flag: options.db }));
	},
	closeContext: (db) => db.close(),
	commands: {
		mcp: async (options) => {
			const { serveEmailMcp } = await import('./surface/serve_email_mcp.ts');
			await serveEmailMcp(options.db === undefined ? {} : { dbPath: options.db });
		},
		skill: async () => {
			const { renderSkillMarkdown } = await import('./surfaces/skill_markdown.ts');
			const { emailSkillSpec } = await import('./surface/email_skill_spec.ts');
			return renderSkillMarkdown(emailSkillSpec);
		},
	},
});
