import { defineCommand, runMain } from 'citty';
import { emailVersion } from '../version.ts';
import { accountCommand } from './commands/account.ts';
import { composeCommand } from './commands/compose.ts';
import { organizeCommand } from './commands/organize.ts';
import { readCommand } from './commands/read.ts';
import { searchCommand } from './commands/search.ts';
import { syncCommand } from './commands/sync.ts';

const main = defineCommand({
	meta: {
		name: 'email',
		version: emailVersion,
		description: 'Local-first email CLI powered by @ghostpaw/email.',
	},
	subCommands: {
		mcp: defineCommand({
			meta: { name: 'mcp', description: 'Serve the aligned email tools over MCP stdio.' },
		}),
		tools: defineCommand({
			meta: { name: 'tools', description: 'List aligned email tools and schemas.' },
		}),
		call: defineCommand({
			meta: { name: 'call', description: 'Call an aligned tool with JSON input.' },
		}),
		skill: defineCommand({
			meta: { name: 'skill', description: 'Print the generated Agent Skill.' },
		}),
		account: accountCommand,
		read: readCommand,
		search: searchCommand,
		compose: composeCommand,
		organize: organizeCommand,
		sync: syncCommand,
	},
});

// runMain handles --help, --version, and subcommand routing.
// All errors from command run() functions are caught by safeRun() inside each
// command, so they never reach runMain's own error handler.
export async function runEmailCli(args = process.argv.slice(2)): Promise<void> {
	let index = 0;
	while (index < args.length) {
		const token = args[index];
		if (token === '--db') {
			index += 2;
			continue;
		}
		if (
			token === '--compact' ||
			token === '--json' ||
			token === '--quiet' ||
			token === '--no-color' ||
			token?.startsWith('--db=')
		) {
			index++;
			continue;
		}
		break;
	}
	const command = args[index];
	if (
		command &&
		(['mcp', 'tools', 'call', 'skill', 'describe', '--version', '-v'].includes(command) ||
			command.startsWith('mail_') ||
			['mail', 'help', 'completions', 'version', '-V'].includes(command))
	) {
		const { runToolCli } = await import('../surfaces/cli.ts');
		const { emailCliOptions } = await import('../surface/email_cli_options.ts');
		process.exitCode = await runToolCli(args, emailCliOptions);
	} else {
		runMain(main);
	}
}
