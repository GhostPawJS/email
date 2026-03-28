import type { ComposeInput, ForwardInput, ReplyInput } from '../types/compose.ts';
import type { EmailToolDefinition } from './tool_metadata.ts';

// ─── Input types ─────────────────────────────────────────────────────────────

type MailReadInput =
	| { view: 'folders'; refresh?: boolean }
	| { view: 'queue'; folder?: string; unreadOnly?: boolean; limit?: number; refresh?: boolean }
	| { view: 'thread'; threadId: string }
	| { view: 'message'; folder: string; uid: number }
	| { view: 'attachment'; folder: string; uid: number; partPath?: string }
	| { view: 'eml'; folder: string; uid: number };

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

type MailComposeInput =
	| { action: 'send'; input: ComposeInput }
	| { action: 'reply'; folder: string; uid: number; input: ReplyInput }
	| { action: 'forward'; folder: string; uid: number; input: ForwardInput }
	| { action: 'save_draft'; input: ComposeInput }
	| { action: 'update_draft'; uid: number; input: ComposeInput }
	| { action: 'send_draft'; uid: number };

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

type MailSyncInput =
	| { action: 'connect' | 'disconnect' | 'reconnect' }
	| { action: 'sync'; folders?: string[]; bodies?: 'none' | 'missing' | 'all' }
	| { action: 'refresh_folders' }
	| { action: 'watch'; folders?: string[] };

// ─── Tools ───────────────────────────────────────────────────────────────────

export const emailTools = [
	{
		name: 'mail_read',
		description:
			'Read mailbox state: folder list, message queue, thread view, single message body, attachment metadata, or raw EML export.',
		sideEffects: 'read',
		inputSchema: {
			type: 'object',
			required: ['view'],
			properties: {
				view: {
					type: 'string',
					enum: ['folders', 'queue', 'thread', 'message', 'attachment', 'eml'],
					description: 'What to read.',
				},
				folder: {
					type: 'string',
					description: 'Folder path (required for queue/message/attachment/eml).',
				},
				uid: { type: 'integer', description: 'Message UID (required for message/attachment/eml).' },
				threadId: { type: 'string', description: 'Thread ID (required for thread view).' },
				partPath: {
					type: 'string',
					description: 'Part path for a specific attachment (optional for attachment view).',
				},
				limit: { type: 'integer', description: 'Maximum messages to return (queue view).' },
				unreadOnly: {
					type: 'boolean',
					description: 'Filter to unread messages only (queue view).',
				},
				refresh: {
					type: 'boolean',
					description: 'Fetch live folder list from server before returning (folders/queue view).',
				},
			},
		},
		async handler(ctx, input: MailReadInput) {
			try {
				if (input.view === 'folders') {
					const folders = input.refresh ? await ctx.network.refreshFolders() : ctx.read.folders();
					return {
						outcome: 'success' as const,
						summary: `${folders.length} folder(s) available.`,
						entities: folders.map((f) => ({
							kind: 'mailbox' as const,
							id: f.path,
							title: f.role ? `${f.path} [${f.role}]` : f.path,
						})),
						nextSteps: ['Use view: "queue" with a folder to list messages.'],
					};
				}

				if (input.view === 'queue') {
					const folder = input.folder ?? 'INBOX';
					const all = ctx.read.messages(folder, {
						limit: input.limit ?? 50,
						sort: 'date',
						order: 'desc',
					});
					const shown = input.unreadOnly ? all.filter((m) => !m.flags.includes('\\Seen')) : all;
					return {
						outcome: 'success' as const,
						summary: `${shown.length} message(s) in ${folder}.`,
						entities: shown.map((m) => ({
							kind: 'message' as const,
							id: String(m.uid),
							title: m.subject ?? '(no subject)',
						})),
						nextSteps: ['Use view: "message" with folder and uid to read a specific message.'],
					};
				}

				if (input.view === 'thread') {
					const thread = ctx.read.getThread(input.threadId);
					return {
						outcome: 'success' as const,
						summary: `Thread "${thread.subject ?? input.threadId}" has ${thread.messages.length} message(s).`,
						entities: [
							{
								kind: 'thread' as const,
								id: input.threadId,
								title: thread.subject ?? input.threadId,
							},
						],
						nextSteps: ['Use view: "message" to read individual messages in the thread.'],
					};
				}

				if (input.view === 'message') {
					const detail = await ctx.read.getMessage(input.folder, input.uid);
					return {
						outcome: 'success' as const,
						summary: `Message "${detail.subject ?? '(no subject)'}" from ${detail.from?.address ?? 'unknown'}.`,
						entities: [
							{
								kind: 'message' as const,
								id: String(input.uid),
								title: detail.subject ?? '(no subject)',
							},
						],
						nextSteps: detail.attachments?.length
							? ['Use view: "attachment" to inspect or fetch attachments.']
							: [],
					};
				}

				if (input.view === 'attachment') {
					if (!input.partPath) {
						// List attachment metadata.
						const attachments = ctx.read.listAttachments(input.folder, input.uid);
						return {
							outcome: 'success' as const,
							summary: `${attachments.length} attachment(s) on message ${input.uid}.`,
							entities: attachments.map((a) => ({
								kind: 'attachment' as const,
								id: a.partPath,
								title: a.filename ?? a.partPath,
							})),
							nextSteps:
								attachments.length > 0
									? ['Use view: "attachment" with partPath to fetch a specific attachment.']
									: [],
						};
					}
					// Fetch specific attachment.
					const att = await ctx.read.getAttachment(input.folder, input.uid, input.partPath);
					return {
						outcome: 'success' as const,
						summary: `Fetched attachment "${att.filename ?? input.partPath}" (${att.data.length} bytes).`,
						entities: [
							{
								kind: 'attachment' as const,
								id: input.partPath,
								title: att.filename ?? input.partPath,
							},
						],
						nextSteps: [],
					};
				}

				// view === 'eml'
				const eml = await ctx.write.exportEml(input.folder, input.uid);
				return {
					outcome: 'success' as const,
					summary: `Exported EML for message ${input.uid} (${eml.length} bytes).`,
					entities: [
						{ kind: 'message' as const, id: String(input.uid), title: `eml:${input.uid}` },
					],
					nextSteps: [],
				};
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				return {
					outcome: 'error' as const,
					summary: `mail_read failed: ${msg}`,
					entities: [],
					nextSteps: [
						'Check that the folder and UID are correct, and that the account is connected.',
					],
				};
			}
		},
	},

	{
		name: 'mail_search',
		description:
			'Search for messages locally via FTS or remotely via IMAP SEARCH. Returns matching message references.',
		sideEffects: 'read',
		inputSchema: {
			type: 'object',
			required: ['query'],
			properties: {
				query: { type: 'string', description: 'Free-text search query or FTS5 expression.' },
				folder: { type: 'string', description: 'Restrict search to a specific folder.' },
				mode: {
					type: 'string',
					enum: ['local', 'remote'],
					description: 'local (default) or remote IMAP SEARCH.',
				},
				since: { type: 'string', description: 'ISO date string — only messages after this date.' },
				before: {
					type: 'string',
					description: 'ISO date string — only messages before this date.',
				},
				hasAttachments: { type: 'boolean', description: 'Filter to messages with attachments.' },
				unreadOnly: { type: 'boolean', description: 'Filter to unread messages.' },
				limit: { type: 'integer', description: 'Maximum number of results.' },
			},
		},
		async handler(ctx, input: MailSearchInput) {
			try {
				if (input.mode === 'remote') {
					const folder = input.folder ?? 'INBOX';
					const query = {
						text: input.query,
						...(input.since ? { since: new Date(input.since) } : {}),
						...(input.before ? { before: new Date(input.before) } : {}),
						...(input.unreadOnly ? { unseen: true } : {}),
					};
					const uids = await ctx.network.searchRemote(folder, query);
					return {
						outcome: 'success' as const,
						summary: `Remote search found ${uids.length} matching UID(s) in ${folder}.`,
						entities: uids.map((uid) => ({
							kind: 'message' as const,
							id: String(uid),
							title: `uid:${uid}`,
						})),
						nextSteps:
							uids.length > 0
								? ['Use mail_read with view: "message" to fetch message details.']
								: [],
					};
				}

				// Local FTS search.
				const results = ctx.read.search(input.query, {
					...(input.folder !== undefined ? { folder: input.folder } : {}),
					...(input.since !== undefined ? { since: new Date(input.since) } : {}),
					...(input.before !== undefined ? { before: new Date(input.before) } : {}),
					...(input.hasAttachments !== undefined ? { hasAttachments: input.hasAttachments } : {}),
					...(input.unreadOnly !== undefined ? { unreadOnly: input.unreadOnly } : {}),
					...(input.limit !== undefined ? { limit: input.limit } : {}),
				});

				return {
					outcome: 'success' as const,
					summary: `Found ${results.length} matching message(s).`,
					entities: results.map((m) => ({
						kind: 'message' as const,
						id: String(m.uid),
						title: m.subject ?? '(no subject)',
					})),
					nextSteps:
						results.length > 0
							? ['Use mail_read with view: "message" to read a matching message.']
							: ['Try a different query or use mode: "remote" to search on the server.'],
				};
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				return {
					outcome: 'error' as const,
					summary: `mail_search failed: ${msg}`,
					entities: [],
					nextSteps: ['Check your query syntax and account connection.'],
				};
			}
		},
	},

	{
		name: 'mail_compose',
		description:
			'Compose and send email: send new message, reply, forward, save/update/send a draft.',
		sideEffects: 'external',
		inputSchema: {
			type: 'object',
			required: ['action'],
			properties: {
				action: {
					type: 'string',
					enum: ['send', 'reply', 'forward', 'save_draft', 'update_draft', 'send_draft'],
				},
				folder: { type: 'string', description: 'Source folder (required for reply/forward).' },
				uid: {
					type: 'integer',
					description: 'Source message UID (required for reply/forward/update_draft/send_draft).',
				},
				input: {
					type: 'object',
					description: 'ComposeInput / ReplyInput / ForwardInput payload.',
				},
			},
		},
		async handler(ctx, input: MailComposeInput) {
			try {
				if (input.action === 'send') {
					const res = await ctx.write.send(input.input);
					return {
						outcome: 'success' as const,
						summary: `Message sent (messageId: ${res.messageId}).`,
						entities: [{ kind: 'message' as const, id: res.messageId, title: res.messageId }],
						nextSteps: [],
					};
				}

				if (input.action === 'reply') {
					const res = await ctx.write.reply(input.folder, input.uid, input.input);
					return {
						outcome: 'success' as const,
						summary: `Reply sent (messageId: ${res.messageId}).`,
						entities: [{ kind: 'message' as const, id: res.messageId, title: res.messageId }],
						nextSteps: [],
					};
				}

				if (input.action === 'forward') {
					const res = await ctx.write.forward(input.folder, input.uid, input.input);
					return {
						outcome: 'success' as const,
						summary: `Message forwarded (messageId: ${res.messageId}).`,
						entities: [{ kind: 'message' as const, id: res.messageId, title: res.messageId }],
						nextSteps: [],
					};
				}

				if (input.action === 'save_draft') {
					const res = await ctx.write.saveDraft(input.input);
					return {
						outcome: 'success' as const,
						summary: `Draft saved (uid: ${res.uid}).`,
						entities: [
							{ kind: 'message' as const, id: String(res.uid), title: `draft:${res.uid}` },
						],
						nextSteps: ['Use action: "send_draft" with the uid to send when ready.'],
					};
				}

				if (input.action === 'update_draft') {
					const res = await ctx.write.updateDraft(input.uid, input.input);
					return {
						outcome: 'success' as const,
						summary: `Draft ${input.uid} updated (uid: ${res.uid}).`,
						entities: [
							{ kind: 'message' as const, id: String(res.uid), title: `draft:${res.uid}` },
						],
						nextSteps: ['Use action: "send_draft" to send this draft.'],
					};
				}

				// action === 'send_draft'
				const res = await ctx.write.sendDraft(input.uid);
				return {
					outcome: 'success' as const,
					summary: `Draft ${input.uid} sent (messageId: ${res.messageId}).`,
					entities: [{ kind: 'message' as const, id: res.messageId, title: res.messageId }],
					nextSteps: [],
				};
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				return {
					outcome: 'error' as const,
					summary: `mail_compose failed: ${msg}`,
					entities: [],
					nextSteps: ['Verify recipients, account connection, and required input fields.'],
				};
			}
		},
	},

	{
		name: 'mail_organize',
		description:
			'Organize messages: mark read/unread/starred/answered, copy, move, archive, trash, junk, label, or manage folders.',
		sideEffects: 'write',
		inputSchema: {
			type: 'object',
			required: ['action'],
			properties: {
				action: {
					type: 'string',
					enum: [
						'mark_read',
						'mark_unread',
						'star',
						'unstar',
						'mark_answered',
						'copy',
						'move',
						'archive',
						'trash',
						'junk',
						'not_junk',
						'set_labels',
						'add_labels',
						'remove_labels',
						'create_folder',
						'rename_folder',
						'delete_folder',
						'subscribe_folder',
						'unsubscribe_folder',
					],
				},
				folder: { type: 'string', description: 'Source folder (required for message actions).' },
				uids: { type: 'array', items: { type: 'integer' }, description: 'Message UIDs to act on.' },
				destination: {
					type: 'string',
					description: 'Destination folder (required for copy/move).',
				},
				labels: {
					type: 'array',
					items: { type: 'string' },
					description: 'Labels to set/add/remove.',
				},
				path: { type: 'string', description: 'Folder path (required for folder actions).' },
				oldPath: { type: 'string', description: 'Old folder path (required for rename_folder).' },
				newPath: { type: 'string', description: 'New folder path (required for rename_folder).' },
			},
		},
		async handler(ctx, input: MailOrganizeInput) {
			try {
				// Flag operations
				if (input.action === 'mark_read') {
					await ctx.write.markRead(input.folder, input.uids);
					return {
						outcome: 'success' as const,
						summary: `Marked ${input.uids.length} message(s) as read.`,
						entities: input.uids.map((uid) => ({
							kind: 'message' as const,
							id: String(uid),
							title: `uid:${uid}`,
						})),
						nextSteps: [],
					};
				}
				if (input.action === 'mark_unread') {
					await ctx.write.markUnread(input.folder, input.uids);
					return {
						outcome: 'success' as const,
						summary: `Marked ${input.uids.length} message(s) as unread.`,
						entities: input.uids.map((uid) => ({
							kind: 'message' as const,
							id: String(uid),
							title: `uid:${uid}`,
						})),
						nextSteps: [],
					};
				}
				if (input.action === 'star') {
					await ctx.write.star(input.folder, input.uids);
					return {
						outcome: 'success' as const,
						summary: `Starred ${input.uids.length} message(s).`,
						entities: input.uids.map((uid) => ({
							kind: 'message' as const,
							id: String(uid),
							title: `uid:${uid}`,
						})),
						nextSteps: [],
					};
				}
				if (input.action === 'unstar') {
					await ctx.write.unstar(input.folder, input.uids);
					return {
						outcome: 'success' as const,
						summary: `Unstarred ${input.uids.length} message(s).`,
						entities: input.uids.map((uid) => ({
							kind: 'message' as const,
							id: String(uid),
							title: `uid:${uid}`,
						})),
						nextSteps: [],
					};
				}
				if (input.action === 'mark_answered') {
					await ctx.write.markAnswered(input.folder, input.uids);
					return {
						outcome: 'success' as const,
						summary: `Marked ${input.uids.length} message(s) as answered.`,
						entities: input.uids.map((uid) => ({
							kind: 'message' as const,
							id: String(uid),
							title: `uid:${uid}`,
						})),
						nextSteps: [],
					};
				}

				// Copy / Move
				if (input.action === 'copy') {
					await ctx.write.copyTo(input.folder, input.uids, input.destination);
					return {
						outcome: 'success' as const,
						summary: `Copied ${input.uids.length} message(s) to ${input.destination}.`,
						entities: input.uids.map((uid) => ({
							kind: 'message' as const,
							id: String(uid),
							title: `uid:${uid}`,
						})),
						nextSteps: [],
					};
				}
				if (input.action === 'move') {
					await ctx.write.moveTo(input.folder, input.uids, input.destination);
					return {
						outcome: 'success' as const,
						summary: `Moved ${input.uids.length} message(s) to ${input.destination}.`,
						entities: input.uids.map((uid) => ({
							kind: 'message' as const,
							id: String(uid),
							title: `uid:${uid}`,
						})),
						nextSteps: [],
					};
				}

				// Bulk disposition
				if (input.action === 'archive') {
					await ctx.write.archive(input.folder, input.uids);
					return {
						outcome: 'success' as const,
						summary: `Archived ${input.uids.length} message(s).`,
						entities: input.uids.map((uid) => ({
							kind: 'message' as const,
							id: String(uid),
							title: `uid:${uid}`,
						})),
						nextSteps: [],
					};
				}
				if (input.action === 'trash') {
					await ctx.write.trash(input.folder, input.uids);
					return {
						outcome: 'success' as const,
						summary: `Moved ${input.uids.length} message(s) to Trash.`,
						entities: input.uids.map((uid) => ({
							kind: 'message' as const,
							id: String(uid),
							title: `uid:${uid}`,
						})),
						nextSteps: [],
					};
				}
				if (input.action === 'junk') {
					await ctx.write.moveToJunk(input.folder, input.uids);
					return {
						outcome: 'success' as const,
						summary: `Moved ${input.uids.length} message(s) to Junk.`,
						entities: input.uids.map((uid) => ({
							kind: 'message' as const,
							id: String(uid),
							title: `uid:${uid}`,
						})),
						nextSteps: [],
					};
				}
				if (input.action === 'not_junk') {
					await ctx.write.markNotJunk(
						input.folder,
						input.uids,
						(input as { destination?: string }).destination,
					);
					return {
						outcome: 'success' as const,
						summary: `Marked ${input.uids.length} message(s) as not junk.`,
						entities: input.uids.map((uid) => ({
							kind: 'message' as const,
							id: String(uid),
							title: `uid:${uid}`,
						})),
						nextSteps: [],
					};
				}

				// Labels
				if (input.action === 'set_labels') {
					await ctx.write.setLabels(input.folder, input.uids, input.labels);
					return {
						outcome: 'success' as const,
						summary: `Set labels [${input.labels.join(', ')}] on ${input.uids.length} message(s).`,
						entities: input.uids.map((uid) => ({
							kind: 'message' as const,
							id: String(uid),
							title: `uid:${uid}`,
						})),
						nextSteps: [],
					};
				}
				if (input.action === 'add_labels') {
					await ctx.write.addLabels(input.folder, input.uids, input.labels);
					return {
						outcome: 'success' as const,
						summary: `Added labels [${input.labels.join(', ')}] to ${input.uids.length} message(s).`,
						entities: input.uids.map((uid) => ({
							kind: 'message' as const,
							id: String(uid),
							title: `uid:${uid}`,
						})),
						nextSteps: [],
					};
				}
				if (input.action === 'remove_labels') {
					await ctx.write.removeLabels(input.folder, input.uids, input.labels);
					return {
						outcome: 'success' as const,
						summary: `Removed labels [${input.labels.join(', ')}] from ${input.uids.length} message(s).`,
						entities: input.uids.map((uid) => ({
							kind: 'message' as const,
							id: String(uid),
							title: `uid:${uid}`,
						})),
						nextSteps: [],
					};
				}

				// Folder management
				if (input.action === 'create_folder') {
					await ctx.write.createFolder(input.path);
					return {
						outcome: 'success' as const,
						summary: `Folder "${input.path}" created.`,
						entities: [{ kind: 'mailbox' as const, id: input.path, title: input.path }],
						nextSteps: ['Use mail_sync with action: "refresh_folders" to update the folder list.'],
					};
				}
				if (input.action === 'rename_folder') {
					await ctx.write.renameFolder(input.oldPath, input.newPath);
					return {
						outcome: 'success' as const,
						summary: `Folder renamed from "${input.oldPath}" to "${input.newPath}".`,
						entities: [{ kind: 'mailbox' as const, id: input.newPath, title: input.newPath }],
						nextSteps: [],
					};
				}
				if (input.action === 'delete_folder') {
					await ctx.write.deleteFolder(input.path);
					return {
						outcome: 'success' as const,
						summary: `Folder "${input.path}" deleted.`,
						entities: [],
						nextSteps: [],
					};
				}
				if (input.action === 'subscribe_folder') {
					await ctx.write.subscribeFolder(input.path);
					return {
						outcome: 'success' as const,
						summary: `Subscribed to folder "${input.path}".`,
						entities: [{ kind: 'mailbox' as const, id: input.path, title: input.path }],
						nextSteps: [],
					};
				}
				// action === 'unsubscribe_folder'
				const unsub = input as { action: 'unsubscribe_folder'; path: string };
				await ctx.write.unsubscribeFolder(unsub.path);
				return {
					outcome: 'success' as const,
					summary: `Unsubscribed from folder "${unsub.path}".`,
					entities: [],
					nextSteps: [],
				};
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				return {
					outcome: 'error' as const,
					summary: `mail_organize failed: ${msg}`,
					entities: [],
					nextSteps: ['Check folder paths, UIDs, and account connection.'],
				};
			}
		},
	},

	{
		name: 'mail_sync',
		description:
			'Manage the IMAP connection lifecycle and sync local state: connect, disconnect, reconnect, sync folders, or refresh the folder list.',
		sideEffects: 'external',
		inputSchema: {
			type: 'object',
			required: ['action'],
			properties: {
				action: {
					type: 'string',
					enum: ['connect', 'disconnect', 'reconnect', 'sync', 'refresh_folders', 'watch'],
				},
				folders: {
					type: 'array',
					items: { type: 'string' },
					description: 'Folders to sync or watch (optional — defaults to all subscribed folders).',
				},
				bodies: {
					type: 'string',
					enum: ['none', 'missing', 'all'],
					description: 'Body fetch strategy for sync (default: missing).',
				},
			},
		},
		async handler(ctx, input: MailSyncInput) {
			try {
				if (input.action === 'connect') {
					await ctx.network.connect();
					return {
						outcome: 'success' as const,
						summary: 'Connected to IMAP server.',
						entities: [],
						nextSteps: ['Use action: "sync" to pull new messages.'],
					};
				}

				if (input.action === 'disconnect') {
					await ctx.network.disconnect();
					return {
						outcome: 'success' as const,
						summary: 'Disconnected from IMAP server.',
						entities: [],
						nextSteps: [],
					};
				}

				if (input.action === 'reconnect') {
					await ctx.network.reconnect();
					return {
						outcome: 'success' as const,
						summary: 'Reconnected to IMAP server with exponential back-off.',
						entities: [],
						nextSteps: ['Use action: "sync" to pull new messages.'],
					};
				}

				if (input.action === 'sync') {
					const syncInput = input as {
						action: 'sync';
						folders?: string[];
						bodies?: 'none' | 'missing' | 'all';
					};
					const result = await ctx.network.sync({
						...(syncInput.folders !== undefined ? { folders: syncInput.folders } : {}),
						bodies: syncInput.bodies ?? 'missing',
					});
					const newCount = result.totalNew;
					const expunged = result.totalExpunged;
					return {
						outcome: 'success' as const,
						summary: `Sync complete: ${newCount} new, ${expunged} expunged across ${result.folders.length} folder(s).`,
						entities: result.folders.map((f) => ({
							kind: 'mailbox' as const,
							id: f.path,
							title: `${f.path} (+${f.newMessages} new)`,
						})),
						nextSteps:
							newCount > 0 ? ['Use mail_read with view: "queue" to see new messages.'] : [],
					};
				}

				if (input.action === 'refresh_folders') {
					const folders = await ctx.network.refreshFolders();
					return {
						outcome: 'success' as const,
						summary: `Refreshed folder list: ${folders.length} folder(s).`,
						entities: folders.map((f) => ({
							kind: 'mailbox' as const,
							id: f.path,
							title: f.role ? `${f.path} [${f.role}]` : f.path,
						})),
						nextSteps: [],
					};
				}

				// action === 'watch'
				// Sync the requested folders to get current state, then confirm watch mode is available
				// via the application layer. A single tool call cannot block on an async event stream.
				const watchInput = input as { action: 'watch'; folders?: string[] };
				const syncResult = await ctx.network.sync(
					watchInput.folders !== undefined ? { folders: watchInput.folders } : {},
				);
				return {
					outcome: 'success' as const,
					summary: `Synced ${syncResult.folders.length} folder(s) before watch. Use Mailbox.network.watch() for continuous IDLE monitoring.`,
					entities: syncResult.folders.map((f) => ({
						kind: 'mailbox' as const,
						id: f.path,
						title: f.path,
					})),
					nextSteps: ['Attach a watch() handler in the application layer for push updates.'],
				};
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				return {
					outcome: 'error' as const,
					summary: `mail_sync failed: ${msg}`,
					entities: [],
					nextSteps: ['Check account credentials and network connectivity.'],
				};
			}
		},
	},
] satisfies readonly EmailToolDefinition[];
