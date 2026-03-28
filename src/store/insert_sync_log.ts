import type { EmailDb } from '../database.ts';

export function insertSyncLog(
	db: EmailDb,
	folderId: number,
	action: string,
	uid: number,
	details?: string,
): void {
	db.prepare(
		`
			INSERT INTO sync_log (folder_id, action, uid, details)
			VALUES (?, ?, ?, ?)
		`,
	).run(folderId, action, uid, details ?? null);
}
