import type { EmailDb } from '../database.ts';
import { deleteFolderMessages } from '../store/delete_folder_messages.ts';
import { insertSyncLog } from '../store/insert_sync_log.ts';
import { updateFolderSync } from '../store/update_folder_sync.ts';
import type { Folder } from '../types/folder.ts';

export function handleUidValidityChange(db: EmailDb, folder: Folder): void {
	deleteFolderMessages(db, folder.id);
	insertSyncLog(db, folder.id, 'uidvalidity_reset', 0, 'UIDVALIDITY changed');
	updateFolderSync(db, folder.id, {
		uidValidity: null,
		uidNext: null,
		highestModSeq: null,
		messageCount: 0,
		unseenCount: 0,
	});
}
