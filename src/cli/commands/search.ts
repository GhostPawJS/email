import { defineCommand } from 'citty';
import { getEmailToolByName } from '../../tools/index.ts';
import { resolveAccount } from '../account.ts';
import { CliError, safeRun } from '../errors.ts';
import { withMailbox } from '../lifecycle.ts';
import { renderResult } from '../render.ts';

const searchTool = getEmailToolByName('mail_search')!;

export const searchCommand = defineCommand({
	meta: {
		name: 'search',
		description: 'Search for messages via local FTS5 or remote IMAP SEARCH.',
	},
	args: {
		account: { type: 'string' as const, description: 'Account name (overrides default)' },
		json: { type: 'boolean' as const, description: 'Output full result as JSON', default: false },
		quiet: {
			type: 'boolean' as const,
			description: 'Suppress all output except errors',
			default: false,
		},
		query: { type: 'positional', required: true, description: 'Search query or FTS5 expression' },
		folder: { type: 'string', description: 'Restrict search to a specific folder' },
		mode: {
			type: 'string',
			description: 'Search mode: local (default) or remote',
			default: 'local',
		},
		since: { type: 'string', description: 'Only messages after this date (ISO format)' },
		before: { type: 'string', description: 'Only messages before this date (ISO format)' },
		'has-attachments': {
			type: 'boolean',
			description: 'Filter to messages with attachments',
			default: false,
		},
		'unread-only': { type: 'boolean', description: 'Filter to unread messages', default: false },
		limit: { type: 'string', description: 'Maximum number of results (default: 50)' },
	},
	async run({ args }) {
		await safeRun(args as Record<string, unknown>, async () => {
			const query = args.query;
			if (!query)
				throw new CliError(
					'missing_required_flag',
					'<query> is required.\nUsage: email search <query>',
				);

			const mode = args.mode ?? 'local';
			if (mode !== 'local' && mode !== 'remote') {
				throw new CliError(
					'invalid_flag_value',
					`--mode must be "local" or "remote". Got: "${mode}"`,
				);
			}

			type MailSearchInput = {
				query: string;
				folder?: string;
				mode?: 'local' | 'remote';
				since?: string;
				before?: string;
				hasAttachments?: boolean;
				unreadOnly?: boolean;
				limit?: number;
			};

			const input: MailSearchInput = { query, mode };
			if (args.folder) input.folder = args.folder;
			if (args.since) input.since = args.since;
			if (args.before) input.before = args.before;
			if (args['has-attachments']) input.hasAttachments = true;
			if (args['unread-only']) input.unreadOnly = true;
			if (args.limit) {
				const n = parseInt(args.limit, 10);
				if (!Number.isFinite(n) || n <= 0) {
					throw new CliError(
						'invalid_flag_value',
						`--limit must be a positive integer. Got: "${args.limit}"`,
					);
				}
				input.limit = n;
			}

			const account = resolveAccount(args.account);
			const result = await withMailbox(account, (ctx) => searchTool.handler(ctx, input));
			renderResult(result, { json: args.json ?? false, quiet: args.quiet ?? false });
		}); // end safeRun
	},
});
