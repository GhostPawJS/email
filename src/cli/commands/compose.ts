import { readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { defineCommand } from 'citty';
import { getEmailToolByName } from '../../tools/index.ts';
import type { Address } from '../../types/address.ts';
import type { ComposeInput, ForwardInput, ReplyInput } from '../../types/compose.ts';
import { resolveAccount } from '../account.ts';
import { CliError, safeRun } from '../errors.ts';
import { withMailbox } from '../lifecycle.ts';
import { renderResult } from '../render.ts';
import { isStdinPiped, readStdin } from '../stdin.ts';

const composeTool = getEmailToolByName('mail_compose')!;

type MailComposeInput =
	| { action: 'send'; input: ComposeInput }
	| { action: 'reply'; folder: string; uid: number; input: ReplyInput }
	| { action: 'forward'; folder: string; uid: number; input: ForwardInput }
	| { action: 'save_draft'; input: ComposeInput }
	| { action: 'update_draft'; uid: number; input: ComposeInput }
	| { action: 'send_draft'; uid: number };

const sharedArgs = {
	account: { type: 'string' as const, description: 'Account name (overrides default)' },
	json: { type: 'boolean' as const, description: 'Output full result as JSON', default: false },
	quiet: {
		type: 'boolean' as const,
		description: 'Suppress all output except errors',
		default: false,
	},
};

export const composeCommand = defineCommand({
	meta: { name: 'compose', description: 'Compose and send email.' },
	subCommands: {
		send: defineCommand({
			meta: { name: 'send', description: 'Send a new email.' },
			args: {
				...sharedArgs,
				to: { type: 'string', description: 'Recipient(s), comma-separated', required: true },
				subject: { type: 'string', description: 'Email subject', required: true },
				body: { type: 'string', description: 'Email body text (or pipe via stdin)' },
				html: { type: 'boolean', description: 'Treat body as HTML', default: false },
				cc: { type: 'string', description: 'CC recipient(s), comma-separated' },
				bcc: { type: 'string', description: 'BCC recipient(s), comma-separated' },
				from: { type: 'string', description: 'From address (overrides account identity)' },
				attach: { type: 'string', description: 'File path(s) to attach, comma-separated' },
			},
			async run({ args: _args }) {
				type Args = {
					account?: string;
					json: boolean;
					quiet: boolean;
					to: string;
					subject: string;
					body?: string;
					html: boolean;
					cc?: string;
					bcc?: string;
					from?: string;
					attach?: string;
				};
				const args = _args as unknown as Args;
				await safeRun(_args as Record<string, unknown>, async () => {
					const body = await resolveBody(args.body);
					const composeInput: ComposeInput = {
						to: parseAddresses(args.to),
						subject: args.subject,
					};
					if (args.html) {
						composeInput.html = body;
					} else {
						composeInput.text = body;
					}
					if (args.cc) composeInput.cc = parseAddresses(args.cc);
					if (args.bcc) composeInput.bcc = parseAddresses(args.bcc);
					if (args.from) composeInput.from = parseAddress(args.from);
					if (args.attach) composeInput.attachments = loadAttachments(args.attach);

					const toolInput: MailComposeInput = { action: 'send', input: composeInput };
					const account = resolveAccount(args.account);
					const result = await withMailbox(account, (ctx) => composeTool.handler(ctx, toolInput));
					renderResult(result, { json: args.json, quiet: args.quiet });
				}); // end safeRun
			},
		}),

		reply: defineCommand({
			meta: { name: 'reply', description: 'Reply to a message.' },
			args: {
				...sharedArgs,
				folder: { type: 'string', description: 'Source folder', required: true },
				uid: { type: 'string', description: 'Source message UID', required: true },
				body: { type: 'string', description: 'Reply body (or pipe via stdin)' },
				html: { type: 'boolean', description: 'Treat body as HTML', default: false },
				to: { type: 'string', description: 'Override recipient(s)' },
				cc: { type: 'string', description: 'CC recipient(s)' },
				'reply-all': { type: 'boolean', description: 'Reply to all recipients', default: false },
				attach: { type: 'string', description: 'File path(s) to attach, comma-separated' },
			},
			async run({ args: _args }) {
				type Args = {
					account?: string;
					json: boolean;
					quiet: boolean;
					folder: string;
					uid: string;
					body?: string;
					html: boolean;
					to?: string;
					cc?: string;
					'reply-all': boolean;
					attach?: string;
				};
				const args = _args as unknown as Args;
				await safeRun(_args as Record<string, unknown>, async () => {
					const uid = parseUid(args.uid);
					const body = await resolveBody(args.body);
					const replyInput: ReplyInput = {};
					if (args.html) {
						replyInput.html = body;
					} else {
						replyInput.text = body;
					}
					if (args.to) replyInput.to = parseAddresses(args.to);
					if (args.cc) replyInput.cc = parseAddresses(args.cc);
					if (args['reply-all']) replyInput.replyAll = true;
					if (args.attach) replyInput.attachments = loadAttachments(args.attach);

					const toolInput: MailComposeInput = {
						action: 'reply',
						folder: args.folder,
						uid,
						input: replyInput,
					};
					const account = resolveAccount(args.account);
					const result = await withMailbox(account, (ctx) => composeTool.handler(ctx, toolInput));
					renderResult(result, { json: args.json, quiet: args.quiet });
				}); // end safeRun
			},
		}),

		forward: defineCommand({
			meta: { name: 'forward', description: 'Forward a message.' },
			args: {
				...sharedArgs,
				folder: { type: 'string', description: 'Source folder', required: true },
				uid: { type: 'string', description: 'Source message UID', required: true },
				to: {
					type: 'string',
					description: 'Forward recipient(s), comma-separated',
					required: true,
				},
				body: { type: 'string', description: 'Forwarding note (or pipe via stdin)' },
				html: { type: 'boolean', description: 'Treat body as HTML', default: false },
				mode: { type: 'string', description: 'inline or attachment (default: inline)' },
			},
			async run({ args: _args }) {
				type Args = {
					account?: string;
					json: boolean;
					quiet: boolean;
					folder: string;
					uid: string;
					to: string;
					body?: string;
					html: boolean;
					mode?: string;
				};
				const args = _args as unknown as Args;
				await safeRun(_args as Record<string, unknown>, async () => {
					const uid = parseUid(args.uid);
					const body = await resolveBody(args.body, false); // body is optional for forward

					const mode = args.mode as 'inline' | 'attachment' | undefined;
					if (mode !== undefined && mode !== 'inline' && mode !== 'attachment') {
						throw new CliError('invalid_flag_value', '--mode must be "inline" or "attachment".');
					}

					const fwdInput: ForwardInput = { to: parseAddresses(args.to) };
					if (args.html) {
						if (body) fwdInput.html = body;
					} else {
						if (body) fwdInput.text = body;
					}
					if (mode) fwdInput.mode = mode;

					const toolInput: MailComposeInput = {
						action: 'forward',
						folder: args.folder,
						uid,
						input: fwdInput,
					};
					const account = resolveAccount(args.account);
					const result = await withMailbox(account, (ctx) => composeTool.handler(ctx, toolInput));
					renderResult(result, { json: args.json, quiet: args.quiet });
				}); // end safeRun
			},
		}),

		draft: defineCommand({
			meta: { name: 'draft', description: 'Save, update, or send a draft.' },
			args: {
				...sharedArgs,
				save: { type: 'boolean', description: 'Save a new draft', default: false },
				'send-draft': { type: 'string', description: 'UID of draft to send' },
				'update-draft': { type: 'string', description: 'UID of draft to update' },
				to: { type: 'string', description: 'Recipient(s), comma-separated' },
				subject: { type: 'string', description: 'Email subject' },
				body: { type: 'string', description: 'Draft body (or pipe via stdin)' },
				html: { type: 'boolean', description: 'Treat body as HTML', default: false },
				cc: { type: 'string', description: 'CC recipient(s)' },
				from: { type: 'string', description: 'From address' },
			},
			async run({ args: _args }) {
				type Args = {
					account?: string;
					json: boolean;
					quiet: boolean;
					save: boolean;
					'send-draft'?: string;
					'update-draft'?: string;
					to?: string;
					subject?: string;
					body?: string;
					html: boolean;
					cc?: string;
					from?: string;
				};
				const args = _args as unknown as Args;
				await safeRun(_args as Record<string, unknown>, async () => {
					let toolInput: MailComposeInput;

					if (args['send-draft']) {
						toolInput = { action: 'send_draft', uid: parseUid(args['send-draft']) };
					} else if (args['update-draft'] || args.save) {
						const body = await resolveBody(args.body);
						if (!args.to) {
							throw new CliError('missing_required_flag', '--to is required when saving a draft.');
						}
						if (!args.subject) {
							throw new CliError(
								'missing_required_flag',
								'--subject is required when saving a draft.',
							);
						}
						const composeInput: ComposeInput = {
							to: parseAddresses(args.to),
							subject: args.subject,
						};
						if (args.html) {
							composeInput.html = body;
						} else {
							composeInput.text = body;
						}
						if (args.cc) composeInput.cc = parseAddresses(args.cc);
						if (args.from) composeInput.from = parseAddress(args.from);

						if (args['update-draft']) {
							toolInput = {
								action: 'update_draft',
								uid: parseUid(args['update-draft']),
								input: composeInput,
							};
						} else {
							toolInput = { action: 'save_draft', input: composeInput };
						}
					} else {
						throw new CliError(
							'missing_required_flag',
							'Provide --save, --update-draft <uid>, or --send-draft <uid>.',
						);
					}

					const account = resolveAccount(args.account);
					const result = await withMailbox(account, (ctx) => composeTool.handler(ctx, toolInput));
					renderResult(result, { json: args.json, quiet: args.quiet });
				}); // end safeRun
			},
		}),
	},
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolves body text: flag > stdin > error (unless optional). */
async function resolveBody(flagValue: string | undefined, required = true): Promise<string> {
	if (flagValue !== undefined) return flagValue;
	if (isStdinPiped()) return readStdin();
	if (required) {
		throw new CliError(
			'body_required',
			'Body is required. Provide --body <text> or pipe text via stdin.',
		);
	}
	return '';
}

/** Parse "Name <email>" or "email" into Address. */
function parseAddress(raw: string): Address {
	const match = /^(.+?)\s*<([^>]+)>$/.exec(raw.trim());
	if (match) {
		const name = match[1]?.trim();
		const address = match[2]?.trim() ?? '';
		return name ? { name, address } : { address };
	}
	return { address: raw.trim() };
}

/** Parse comma-separated or single address string. */
function parseAddresses(raw: string): Address[] {
	return raw
		.split(',')
		.map((s) => parseAddress(s.trim()))
		.filter((a) => a.address);
}

function parseUid(raw: string | undefined): number {
	if (!raw) throw new CliError('missing_required_flag', '--uid is required.');
	const n = parseInt(raw, 10);
	if (!Number.isFinite(n) || n <= 0) {
		throw new CliError('invalid_flag_value', `--uid must be a positive integer. Got: "${raw}"`);
	}
	return n;
}

function loadAttachments(
	paths: string,
): Array<{ filename: string; content: Buffer; mimeType?: string }> {
	return paths.split(',').map((p) => {
		const filePath = p.trim();
		const content = readFileSync(filePath);
		const filename = basename(filePath);
		const mimeType = extensionToMime(extname(filename).toLowerCase());
		return mimeType ? { filename, content, mimeType } : { filename, content };
	});
}

const MIME_MAP: Record<string, string> = {
	'.pdf': 'application/pdf',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.txt': 'text/plain',
	'.html': 'text/html',
	'.htm': 'text/html',
	'.csv': 'text/csv',
	'.json': 'application/json',
	'.zip': 'application/zip',
	'.xml': 'application/xml',
	'.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'.mp4': 'video/mp4',
	'.mp3': 'audio/mpeg',
};

function extensionToMime(ext: string): string | undefined {
	return MIME_MAP[ext];
}
