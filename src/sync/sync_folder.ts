import type { EmailDb } from '../database.ts';
import type { ImapSession } from '../imap/session.ts';
import { computeThreads } from '../store/compute_threads.ts';
import type { Folder } from '../types/folder.ts';
import type { SyncFolderResult, SyncOptions } from '../types/sync.ts';
import { incrementalSyncFallback, UIDVALIDITY_CHANGED } from './incremental_sync_fallback.ts';
import { incrementalSyncQresync } from './incremental_sync_qresync.ts';
import { initialSync } from './initial_sync.ts';
import { handleUidValidityChange } from './uid_validity.ts';

export async function syncFolder(
	session: ImapSession,
	db: EmailDb,
	folder: Folder,
	_options?: SyncOptions,
): Promise<SyncFolderResult> {
	const isFirstSync = folder.uidValidity === null;

	if (isFirstSync) {
		const result = await initialSync(session, db, folder.id, folder.path);
		computeThreads(db, folder.id);
		return result;
	}

	if (session.extensions.qresync) {
		const result = await incrementalSyncQresync(session, db, folder);
		computeThreads(db, folder.id);
		return result;
	}

	// Fallback sync
	const result = await incrementalSyncFallback(session, db, folder);
	if (result === UIDVALIDITY_CHANGED) {
		handleUidValidityChange(db, folder);
		const newResult = await initialSync(session, db, folder.id, folder.path);
		computeThreads(db, folder.id);
		return newResult;
	}
	computeThreads(db, folder.id);
	return result;
}
