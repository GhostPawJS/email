import { defineCommand, runMain } from 'citty';
import { accountCommand } from './commands/account.ts';
import { composeCommand } from './commands/compose.ts';
import { organizeCommand } from './commands/organize.ts';
import { readCommand } from './commands/read.ts';
import { searchCommand } from './commands/search.ts';
import { syncCommand } from './commands/sync.ts';

const main = defineCommand({
	meta: {
		name: 'email',
		version: '0.2.0',
		description: 'Local-first email CLI powered by @ghostpaw/email.',
	},
	subCommands: {
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
runMain(main);
