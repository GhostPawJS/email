import type { EmailDb } from '../database.ts';
import type { Folder } from '../types/folder.ts';

function mapFolder(row: Record<string, unknown>): Folder {
	return {
		id: Number(row.id),
		accountId: Number(row.account_id),
		path: String(row.path),
		delimiter: String(row.delimiter),
		role: row.role != null ? (String(row.role) as Folder['role']) : null,
		uidValidity: row.uid_validity != null ? Number(row.uid_validity) : null,
		uidNext: row.uid_next != null ? Number(row.uid_next) : null,
		highestModSeq: row.highest_mod_seq != null ? Number(row.highest_mod_seq) : null,
		messageCount: row.message_count != null ? Number(row.message_count) : null,
		unseenCount: row.unseen_count != null ? Number(row.unseen_count) : null,
		lastSyncedAt: row.last_synced_at != null ? String(row.last_synced_at) : null,
	};
}

export function listFolders(db: EmailDb, accountId: number): Folder[] {
	const rows = db
		.prepare('SELECT * FROM folders WHERE account_id = ? ORDER BY path')
		.all(accountId) as Record<string, unknown>[];
	return rows.map(mapFolder);
}
