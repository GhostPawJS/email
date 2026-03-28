import type { EmailDb } from '../database.ts';

export type SyncLogEntry = {
	id: number;
	folderId: number;
	action: string;
	uid: number;
	details: string | null;
	syncedAt: string;
};

export function listSyncLog(
	db: EmailDb,
	folderId: number,
	options?: { limit?: number },
): SyncLogEntry[] {
	const limit = options?.limit ?? 100;
	const rows = db
		.prepare(
			`
				SELECT id, folder_id, action, uid, details, synced_at
				FROM sync_log
				WHERE folder_id = ?
				ORDER BY synced_at DESC
				LIMIT ?
			`,
		)
		.all(folderId, limit) as Record<string, unknown>[];
	return rows.map((row) => ({
		id: Number(row.id),
		folderId: Number(row.folder_id),
		action: String(row.action),
		uid: Number(row.uid),
		details: row.details != null ? String(row.details) : null,
		syncedAt: String(row.synced_at ?? ''),
	}));
}
