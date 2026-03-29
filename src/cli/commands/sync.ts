import { defineCommand } from 'citty';
import { getEmailToolByName } from '../../tools/index.ts';
import { resolveAccount } from '../account.ts';
import { CliError, safeRun } from '../errors.ts';
import { withMailbox } from '../lifecycle.ts';
import { renderResult } from '../render.ts';

const syncTool = getEmailToolByName('mail_sync')!;

const VALID_ACTIONS = ['connect', 'disconnect', 'reconnect', 'sync', 'refresh-folders', 'watch'];

type MailSyncInput =
	| { action: 'connect' | 'disconnect' | 'reconnect' }
	| { action: 'sync'; folders?: string[]; bodies?: 'none' | 'missing' | 'all' }
	| { action: 'refresh_folders' }
	| { action: 'watch'; folders?: string[] };

export const syncCommand = defineCommand({
	meta: {
		name: 'sync',
		description: `Manage IMAP connection and sync local state. Actions: ${VALID_ACTIONS.join(' | ')}`,
	},
	args: {
		account: { type: 'string' as const, description: 'Account name (overrides default)' },
		json: { type: 'boolean' as const, description: 'Output full result as JSON', default: false },
		quiet: {
			type: 'boolean' as const,
			description: 'Suppress all output except errors',
			default: false,
		},
		action: { type: 'positional', required: false, description: 'sync action (default: sync)' },
		folders: { type: 'string', description: 'Folders to sync/watch, comma-separated' },
		bodies: { type: 'string', description: 'Body fetch strategy: none | missing (default) | all' },
	},
	async run({ args }) {
		await safeRun(args as Record<string, unknown>, async () => {
			const action = args.action ?? 'sync';

			if (!VALID_ACTIONS.includes(action)) {
				throw new CliError(
					'unknown_subaction',
					`Unknown action: "${action}". Valid actions:\n  ${VALID_ACTIONS.join(', ')}`,
				);
			}

			const bodies = args.bodies as 'none' | 'missing' | 'all' | undefined;
			if (bodies !== undefined && bodies !== 'none' && bodies !== 'missing' && bodies !== 'all') {
				throw new CliError('invalid_flag_value', '--bodies must be "none", "missing", or "all".');
			}

			let toolInput: MailSyncInput;

			switch (action) {
				case 'connect':
				case 'disconnect':
				case 'reconnect':
					toolInput = { action };
					break;
				case 'sync': {
					const syncInput: {
						action: 'sync';
						folders?: string[];
						bodies?: 'none' | 'missing' | 'all';
					} = { action: 'sync' };
					if (args.folders) syncInput.folders = args.folders.split(',').map((f) => f.trim());
					if (bodies) syncInput.bodies = bodies;
					toolInput = syncInput;
					break;
				}
				case 'refresh-folders':
					toolInput = { action: 'refresh_folders' };
					break;
				case 'watch': {
					const watchInput: { action: 'watch'; folders?: string[] } = { action: 'watch' };
					if (args.folders) watchInput.folders = args.folders.split(',').map((f) => f.trim());
					toolInput = watchInput;
					break;
				}
				default:
					throw new CliError('unknown_subaction', `Unknown action: "${action}"`);
			}

			const account = resolveAccount(args.account);
			const result = await withMailbox(account, (ctx) => syncTool.handler(ctx, toolInput));
			renderResult(result, { json: args.json ?? false, quiet: args.quiet ?? false });
		}); // end safeRun
	},
});
