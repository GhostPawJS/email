import { defineCommand } from 'citty';
import { getEmailToolByName } from '../../tools/index.ts';
import { resolveAccount } from '../account.ts';
import { CliError, safeRun } from '../errors.ts';
import { withMailbox } from '../lifecycle.ts';
import { renderResult } from '../render.ts';

const organizeTool = getEmailToolByName('mail_organize')!;

type MailOrganizeInput =
	| {
			action: 'mark_read' | 'mark_unread' | 'star' | 'unstar' | 'mark_answered';
			folder: string;
			uids: number[];
	  }
	| { action: 'copy' | 'move'; folder: string; uids: number[]; destination: string }
	| { action: 'archive' | 'trash' | 'junk'; folder: string; uids: number[] }
	| { action: 'not_junk'; folder: string; uids: number[]; destination?: string }
	| {
			action: 'set_labels' | 'add_labels' | 'remove_labels';
			folder: string;
			uids: number[];
			labels: string[];
	  }
	| { action: 'create_folder'; path: string }
	| { action: 'rename_folder'; oldPath: string; newPath: string }
	| { action: 'delete_folder' | 'subscribe_folder' | 'unsubscribe_folder'; path: string };

const VALID_ACTIONS = [
	'mark-read',
	'mark-unread',
	'star',
	'unstar',
	'mark-answered',
	'copy',
	'move',
	'archive',
	'trash',
	'junk',
	'not-junk',
	'set-labels',
	'add-labels',
	'remove-labels',
	'create-folder',
	'rename-folder',
	'delete-folder',
	'subscribe-folder',
	'unsubscribe-folder',
];

export const organizeCommand = defineCommand({
	meta: {
		name: 'organize',
		description: `Organize messages and folders. Actions: ${VALID_ACTIONS.join(' | ')}`,
	},
	args: {
		account: { type: 'string' as const, description: 'Account name (overrides default)' },
		json: { type: 'boolean' as const, description: 'Output full result as JSON', default: false },
		quiet: {
			type: 'boolean' as const,
			description: 'Suppress all output except errors',
			default: false,
		},
		action: { type: 'positional', required: true, description: 'Action to perform' },
		folder: { type: 'string', description: 'Source folder (required for message actions)' },
		uids: { type: 'string', description: 'Message UIDs, comma-separated (e.g. "42,43,44")' },
		destination: { type: 'string', description: 'Destination folder (copy/move/not-junk)' },
		labels: { type: 'string', description: 'Labels, comma-separated' },
		path: { type: 'string', description: 'Folder path (create/delete/subscribe/unsubscribe)' },
		'old-path': { type: 'string', description: 'Old folder path (rename-folder)' },
		'new-path': { type: 'string', description: 'New folder path (rename-folder)' },
	},
	async run({ args }) {
		await safeRun(args as Record<string, unknown>, async () => {
			const action = args.action;
			if (!action || !VALID_ACTIONS.includes(action)) {
				throw new CliError(
					'unknown_subaction',
					`Unknown action: "${String(action)}". Valid actions:\n  ${VALID_ACTIONS.join(', ')}`,
				);
			}

			const account = resolveAccount(args.account);
			const opts = { json: args.json ?? false, quiet: args.quiet ?? false };

			const toolInput = buildToolInput(action, args);
			const result = await withMailbox(account, (ctx) => organizeTool.handler(ctx, toolInput));
			renderResult(result, opts);
		}); // end safeRun
	},
});

function parseUids(raw: string | undefined, action: string): number[] {
	if (!raw) {
		throw new CliError('missing_required_flag', `--uids is required for action: ${action}`);
	}
	return raw.split(',').map((s) => {
		const n = parseInt(s.trim(), 10);
		if (!Number.isFinite(n) || n <= 0) {
			throw new CliError(
				'invalid_flag_value',
				`--uids must be comma-separated positive integers. Got: "${s.trim()}"`,
			);
		}
		return n;
	});
}

function requireFolder(folder: string | undefined, action: string): string {
	if (!folder) {
		throw new CliError('missing_required_flag', `--folder is required for action: ${action}`);
	}
	return folder;
}

function requirePath(path: string | undefined, action: string): string {
	if (!path) {
		throw new CliError('missing_required_flag', `--path is required for action: ${action}`);
	}
	return path;
}

function requireDestination(dest: string | undefined, action: string): string {
	if (!dest) {
		throw new CliError('missing_required_flag', `--destination is required for action: ${action}`);
	}
	return dest;
}

function requireLabels(labels: string | undefined, action: string): string[] {
	if (!labels) {
		throw new CliError('missing_required_flag', `--labels is required for action: ${action}`);
	}
	return labels
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}

// Maps kebab-case CLI action → snake_case tool action
function buildToolInput(
	action: string,
	args: {
		folder?: string;
		uids?: string;
		destination?: string;
		labels?: string;
		path?: string;
		'old-path'?: string;
		'new-path'?: string;
	},
): MailOrganizeInput {
	switch (action) {
		case 'mark-read':
			return {
				action: 'mark_read',
				folder: requireFolder(args.folder, action),
				uids: parseUids(args.uids, action),
			};
		case 'mark-unread':
			return {
				action: 'mark_unread',
				folder: requireFolder(args.folder, action),
				uids: parseUids(args.uids, action),
			};
		case 'star':
			return {
				action: 'star',
				folder: requireFolder(args.folder, action),
				uids: parseUids(args.uids, action),
			};
		case 'unstar':
			return {
				action: 'unstar',
				folder: requireFolder(args.folder, action),
				uids: parseUids(args.uids, action),
			};
		case 'mark-answered':
			return {
				action: 'mark_answered',
				folder: requireFolder(args.folder, action),
				uids: parseUids(args.uids, action),
			};
		case 'copy':
			return {
				action: 'copy',
				folder: requireFolder(args.folder, action),
				uids: parseUids(args.uids, action),
				destination: requireDestination(args.destination, action),
			};
		case 'move':
			return {
				action: 'move',
				folder: requireFolder(args.folder, action),
				uids: parseUids(args.uids, action),
				destination: requireDestination(args.destination, action),
			};
		case 'archive':
			return {
				action: 'archive',
				folder: requireFolder(args.folder, action),
				uids: parseUids(args.uids, action),
			};
		case 'trash':
			return {
				action: 'trash',
				folder: requireFolder(args.folder, action),
				uids: parseUids(args.uids, action),
			};
		case 'junk':
			return {
				action: 'junk',
				folder: requireFolder(args.folder, action),
				uids: parseUids(args.uids, action),
			};
		case 'not-junk': {
			const input: MailOrganizeInput = {
				action: 'not_junk',
				folder: requireFolder(args.folder, action),
				uids: parseUids(args.uids, action),
			};
			if (args.destination) {
				(
					input as { action: 'not_junk'; folder: string; uids: number[]; destination?: string }
				).destination = args.destination;
			}
			return input;
		}
		case 'set-labels':
			return {
				action: 'set_labels',
				folder: requireFolder(args.folder, action),
				uids: parseUids(args.uids, action),
				labels: requireLabels(args.labels, action),
			};
		case 'add-labels':
			return {
				action: 'add_labels',
				folder: requireFolder(args.folder, action),
				uids: parseUids(args.uids, action),
				labels: requireLabels(args.labels, action),
			};
		case 'remove-labels':
			return {
				action: 'remove_labels',
				folder: requireFolder(args.folder, action),
				uids: parseUids(args.uids, action),
				labels: requireLabels(args.labels, action),
			};
		case 'create-folder':
			return { action: 'create_folder', path: requirePath(args.path, action) };
		case 'rename-folder': {
			if (!args['old-path']) {
				throw new CliError('missing_required_flag', '--old-path is required for rename-folder');
			}
			if (!args['new-path']) {
				throw new CliError('missing_required_flag', '--new-path is required for rename-folder');
			}
			return { action: 'rename_folder', oldPath: args['old-path'], newPath: args['new-path'] };
		}
		case 'delete-folder':
			return { action: 'delete_folder', path: requirePath(args.path, action) };
		case 'subscribe-folder':
			return { action: 'subscribe_folder', path: requirePath(args.path, action) };
		case 'unsubscribe-folder':
			return { action: 'unsubscribe_folder', path: requirePath(args.path, action) };
		default:
			// Unreachable — checked above, but satisfies TypeScript.
			throw new CliError('unknown_subaction', `Unknown action: "${action}"`);
	}
}
