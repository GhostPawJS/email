import type { EmailDb } from './database.ts';
import { EmailUnsupportedError } from './errors.ts';
import { compileSearchQuery } from './imap/search_compiler.ts';
import type { ImapSession } from './imap/session.ts';
import { getBody } from './store/get_body.ts';
import * as store from './store/index.ts';
import { fetchAttachment } from './sync/fetch_attachment.ts';
import { fetchBody } from './sync/fetch_body.ts';
import { syncFolder } from './sync/sync_folder.ts';
import { DEFAULT_MAX_RECONNECT_ATTEMPTS, DEFAULT_MAX_RECONNECT_DELAY } from './types/defaults.ts';
import type { Folder } from './types/folder.ts';
import type { SearchQuery } from './types/search.ts';
import type { EmailNetworkSurface } from './types/surfaces.ts';
import type { SyncOptions, WatchOptions } from './types/sync.ts';

export type CreateNetworkSurfaceOptions = {
	accountId: number;
	session?: ImapSession | null;
};

export function createNetworkSurface(
	db: EmailDb,
	options: CreateNetworkSurfaceOptions,
): EmailNetworkSurface {
	const { accountId, session } = options;

	function requireSession(): ImapSession {
		if (!session) {
			throw new EmailUnsupportedError(
				'network',
				'Use Mailbox.connect() — network surface requires an active IMAP session',
			);
		}
		return session;
	}

	return {
		connect: async () => {
			await requireSession().connect();
		},
		disconnect: async () => {
			await requireSession().disconnect();
		},
		reconnect: async () => {
			const s = requireSession();
			// Exponential backoff: 1s, 2s, 4s, 8s, … capped at DEFAULT_MAX_RECONNECT_DELAY.
			const maxDelay = DEFAULT_MAX_RECONNECT_DELAY;
			const maxAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS;
			let delay = 1000;
			let lastErr: unknown;
			for (let attempt = 0; attempt < maxAttempts; attempt++) {
				try {
					await s.disconnect().catch(() => {});
					await s.connect();
					return; // success
				} catch (err) {
					lastErr = err;
					if (attempt < maxAttempts - 1) {
						await new Promise<void>((res) => setTimeout(res, delay));
						delay = Math.min(delay * 2, maxDelay);
					}
				}
			}
			throw lastErr;
		},
		sync: async (syncOptions?: SyncOptions) => {
			const s = requireSession();
			const folders = store.listFolders(db, accountId);
			const results: ReturnType<typeof syncFolder> extends Promise<infer R> ? R[] : never[] = [];
			let totalNew = 0;
			let totalExpunged = 0;
			for (const folder of folders) {
				if (syncOptions?.folders && !syncOptions.folders.includes(folder.path)) continue;
				const result = await syncFolder(s, db, folder, syncOptions);
				results.push(result);
				totalNew += result.newMessages;
				totalExpunged += result.expunged;
			}
			return { folders: results, totalNew, totalExpunged };
		},
		watch: async function* (watchOptions?: WatchOptions) {
			const s = requireSession();
			const folderPaths = watchOptions?.folders ?? ['INBOX'];
			const folderPath = folderPaths[0] ?? 'INBOX';
			await s.selectFolder(folderPath);
			const controller = new AbortController();
			watchOptions?.signal?.addEventListener?.('abort', () => controller.abort());
			for await (const ev of s.idle({ signal: controller.signal })) {
				if (ev.type === 'exists') {
					// Fetch new messages and yield as WatchEvent
					const results = await s.fetchMessages(`${ev.count}:${ev.count}`, ['UID', 'FLAGS']);
					const msgs = results
						.map((r) => {
							const f = store.getFolder(db, accountId, folderPath);
							if (!f) return null;
							return store.getMessage(db, f.id, r.uid);
						})
						.filter(Boolean);
					const validMsgs = msgs.filter(
						(m): m is NonNullable<typeof m> => m !== null && m !== undefined,
					);
					yield { type: 'new' as const, folder: folderPath, messages: validMsgs };
				} else if (ev.type === 'expunge') {
					yield { type: 'expunge' as const, folder: folderPath, uid: ev.seqno };
				} else if (ev.type === 'fetch') {
					yield { type: 'flags' as const, folder: folderPath, uid: ev.seqno, flags: [] };
				}
			}
		},
		refreshFolders: async () => {
			const s = requireSession();
			const imapFolders = await s.listFolders();
			const result: Folder[] = [];
			for (const f of imapFolders) {
				const upserted = store.upsertFolder(db, {
					accountId,
					path: f.path,
					delimiter: f.delimiter,
					role: f.role,
				});
				result.push(upserted);
			}
			return result;
		},
		searchRemote: async (folder: string, query: SearchQuery) => {
			const s = requireSession();
			if (s.selectedFolder !== folder) {
				await s.selectFolder(folder);
			}
			const compiled = compileSearchQuery(query, s.capabilities);
			return s.searchMessages(compiled);
		},
		fetchBody: async (folder: string, uid: number) => {
			const s = requireSession();
			await fetchBody(s, db, accountId, folder, uid);
			const f = store.getFolder(db, accountId, folder);
			if (!f) throw new Error(`Folder not found: ${folder}`);
			const m = store.getMessage(db, f.id, uid);
			if (!m) throw new Error(`Message not found: uid ${uid}`);
			const body = getBody(db, m.id);
			return {
				textPlain: body?.textPlain ?? null,
				textHtml: body?.textHtml ?? null,
			};
		},
		fetchAttachment: async (folder: string, uid: number, partPath: string) => {
			const s = requireSession();
			const data = await fetchAttachment(s, db, accountId, folder, uid, partPath);
			const f = store.getFolder(db, accountId, folder);
			const m = f ? store.getMessage(db, f.id, uid) : null;
			const list = m ? store.listAttachments(db, m.id) : [];
			const att = list.find((a) => a.partPath === partPath);
			return {
				...(att ?? {
					id: 0,
					messageId: m?.id ?? 0,
					filename: null,
					mimeType: null,
					size: data.length,
					contentId: null,
					partPath,
					inline: false,
				}),
				data,
			};
		},
	};
}
