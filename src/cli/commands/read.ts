import { defineCommand } from 'citty';
import { getEmailToolByName } from '../../tools/index.ts';
import { resolveAccount } from '../account.ts';
import { CliError, safeRun } from '../errors.ts';
import { withMailbox } from '../lifecycle.ts';
import { renderResult } from '../render.ts';

const readTool = getEmailToolByName('mail_read')!;

const sharedArgs = {
	account: { type: 'string' as const, description: 'Account name (overrides default)' },
	json: { type: 'boolean' as const, description: 'Output full result as JSON', default: false },
	quiet: {
		type: 'boolean' as const,
		description: 'Suppress all output except errors',
		default: false,
	},
};

export const readCommand = defineCommand({
	meta: {
		name: 'read',
		description:
			'Read mailbox state. Views: folders | queue (default) | thread | message | attachment | eml',
	},
	args: {
		...sharedArgs,
		view: {
			type: 'positional',
			required: false,
			description: 'folders | queue | thread | message | attachment | eml',
		},
		folder: { type: 'string', description: 'Folder path (queue/message/attachment/eml)' },
		uid: { type: 'string', description: 'Message UID (message/attachment/eml)' },
		'thread-id': { type: 'string', description: 'Thread ID (thread view)' },
		'part-path': { type: 'string', description: 'Attachment part path (attachment view)' },
		limit: { type: 'string', description: 'Max messages to return (queue view)' },
		'unread-only': {
			type: 'boolean',
			description: 'Unread messages only (queue view)',
			default: false,
		},
		refresh: {
			type: 'boolean',
			description: 'Refresh from server before returning',
			default: false,
		},
	},
	async run({ args }) {
		await safeRun(args as Record<string, unknown>, async () => {
			const view = args.view ?? 'queue';
			const account = resolveAccount(args.account);
			const opts = { json: args.json ?? false, quiet: args.quiet ?? false };

			// ── EML: bypass tool layer, write raw bytes to stdout ──
			if (view === 'eml') {
				requireFlag(args.folder, '--folder', 'eml');
				requireFlag(args.uid, '--uid', 'eml');
				const folder = args.folder!;
				const uid = parseUid(args.uid!, 'eml');

				await withMailbox(account, async (ctx) => {
					const eml = await ctx.write.exportEml(folder, uid);
					if (opts.json) {
						const result = {
							outcome: 'success',
							summary: `Exported EML for message ${uid} (${eml.length} bytes).`,
							entities: [{ kind: 'message', id: String(uid), title: `eml:${uid}` }],
							nextSteps: [],
							data: eml.toString('base64'),
						};
						process.stdout.write(JSON.stringify(result, null, 2) + '\n');
					} else {
						process.stdout.write(eml);
					}
				});
				return;
			}

			// ── Attachment fetch: bypass tool layer for raw binary output ──
			if (view === 'attachment' && args['part-path']) {
				requireFlag(args.folder, '--folder', 'attachment');
				requireFlag(args.uid, '--uid', 'attachment');
				const folder = args.folder!;
				const uid = parseUid(args.uid!, 'attachment');
				const partPath = args['part-path'];

				await withMailbox(account, async (ctx) => {
					const att = await ctx.read.getAttachment(folder, uid, partPath);
					if (opts.json) {
						const result = {
							outcome: 'success',
							summary: `Fetched attachment "${att.filename ?? partPath}" (${att.data.length} bytes).`,
							entities: [{ kind: 'attachment', id: partPath, title: att.filename ?? partPath }],
							nextSteps: [],
							data: att.data.toString('base64'),
						};
						process.stdout.write(JSON.stringify(result, null, 2) + '\n');
					} else {
						process.stdout.write(att.data);
					}
				});
				return;
			}

			// ── All other views: go through the tool layer ──
			type MailReadInput =
				| { view: 'folders'; refresh?: boolean }
				| {
						view: 'queue';
						folder?: string;
						unreadOnly?: boolean;
						limit?: number;
						refresh?: boolean;
				  }
				| { view: 'thread'; threadId: string }
				| { view: 'message'; folder: string; uid: number }
				| { view: 'attachment'; folder: string; uid: number; partPath?: string };

			let toolInput: MailReadInput;

			switch (view) {
				case 'folders': {
					toolInput = args.refresh ? { view: 'folders', refresh: true } : { view: 'folders' };
					break;
				}
				case 'queue': {
					const queueInput: {
						view: 'queue';
						folder?: string;
						unreadOnly?: boolean;
						limit?: number;
						refresh?: boolean;
					} = { view: 'queue', folder: args.folder ?? 'INBOX' };
					if (args['unread-only']) queueInput.unreadOnly = true;
					if (args.limit) queueInput.limit = parseInt(args.limit, 10);
					if (args.refresh) queueInput.refresh = true;
					toolInput = queueInput;
					break;
				}
				case 'thread': {
					requireFlag(args['thread-id'], '--thread-id', 'thread');
					toolInput = { view: 'thread', threadId: args['thread-id']! };
					break;
				}
				case 'message': {
					requireFlag(args.folder, '--folder', 'message');
					requireFlag(args.uid, '--uid', 'message');
					toolInput = {
						view: 'message',
						folder: args.folder!,
						uid: parseUid(args.uid!, 'message'),
					};
					break;
				}
				case 'attachment': {
					requireFlag(args.folder, '--folder', 'attachment');
					requireFlag(args.uid, '--uid', 'attachment');
					const attInput: { view: 'attachment'; folder: string; uid: number; partPath?: string } = {
						view: 'attachment',
						folder: args.folder!,
						uid: parseUid(args.uid!, 'attachment'),
					};
					toolInput = attInput;
					break;
				}
				default:
					throw new CliError(
						'unknown_subaction',
						`Unknown view: "${view}". Valid views: folders, queue, thread, message, attachment, eml`,
					);
			}

			const result = await withMailbox(account, (ctx) => readTool.handler(ctx, toolInput));
			renderResult(result, opts);
		}); // end safeRun
	},
});

function requireFlag(
	value: string | undefined,
	flag: string,
	view: string,
): asserts value is string {
	if (!value) {
		throw new CliError(
			'missing_required_flag',
			`${flag} is required for view: ${view}\nUsage: email read ${view} ${flag} <value>`,
		);
	}
}

function parseUid(raw: string, view: string): number {
	const n = parseInt(raw, 10);
	if (!Number.isFinite(n) || n <= 0) {
		throw new CliError(
			'invalid_flag_value',
			`--uid must be a positive integer (view: ${view}). Got: "${raw}"`,
		);
	}
	return n;
}
