import type { DatabaseSync } from 'node:sqlite';
import type { EmailDb } from './database.ts';
import { EmailNotFoundError } from './errors.ts';
import * as store from './store/index.ts';
import type { EmailReadSurface } from './types/surfaces.ts';

export type CreateReadSurfaceOptions = {
	/** When set, enables on-demand body / attachment fetch from IMAP. */
	session?: unknown;
};

export function createReadSurface(
	db: EmailDb,
	accountId: number,
	_options?: CreateReadSurfaceOptions,
): EmailReadSurface {
	return {
		folders: () => store.listFolders(db, accountId),
		folderStatus: (path: string) => {
			const f = store.getFolder(db, accountId, path);
			if (!f) {
				throw new EmailNotFoundError(`Folder not found: ${path}`);
			}
			return {
				messages: f.messageCount ?? 0,
				unseen: f.unseenCount ?? 0,
				uidNext: f.uidNext ?? 0,
				uidValidity: f.uidValidity ?? 0,
				highestModSeq: f.highestModSeq,
			};
		},
		messages: (folder: string, options) => {
			const f = store.getFolder(db, accountId, folder);
			if (!f) return [];
			return store.listMessages(db, f.id, options);
		},
		threads: (folder: string, options) => {
			const f = store.getFolder(db, accountId, folder);
			if (!f) return [];
			return store.listThreads(db, f.id, options);
		},
		getThread: (threadId: string) => store.getThread(db, threadId),
		getMessage: async (folder: string, uid: number) => {
			const f = store.getFolder(db, accountId, folder);
			if (!f) throw new EmailNotFoundError(`Folder not found: ${folder}`);
			const m = store.getMessage(db, f.id, uid);
			if (!m) {
				throw new EmailNotFoundError(`Message not found: ${folder} uid ${uid}`);
			}
			const body = store.getBody(db, m.id);
			const attachments = store.listAttachments(db, m.id);
			return {
				...m,
				textPlain: body?.textPlain ?? null,
				textHtml: body?.textHtml ?? null,
				attachments,
			};
		},
		listAttachments: (folder: string, uid: number) => {
			const f = store.getFolder(db, accountId, folder);
			if (!f) return [];
			const m = store.getMessage(db, f.id, uid);
			if (!m) return [];
			return store.listAttachments(db, m.id);
		},
		getAttachment: async (folder: string, uid: number, partPath: string) => {
			const f = store.getFolder(db, accountId, folder);
			if (!f) throw new EmailNotFoundError(`Folder not found: ${folder}`);
			const m = store.getMessage(db, f.id, uid);
			if (!m) throw new EmailNotFoundError('Message not found');
			const list = store.listAttachments(db, m.id);
			const meta = list.find((a) => a.partPath === partPath);
			if (!meta) {
				throw new EmailNotFoundError(`Attachment not found: ${partPath}`);
			}
			const full = store.getAttachmentData(db, meta.id);
			if (!full) throw new EmailNotFoundError('Attachment row missing');
			return full;
		},
		search: (query: string, options) => store.searchMessages(db, query, options),
		stats: () => store.getStats(db, accountId),
		getDatabase: () => db as DatabaseSync,
	};
}
