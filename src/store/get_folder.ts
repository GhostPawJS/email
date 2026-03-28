import type { EmailDb } from '../database.ts';
import type { Folder } from '../types/folder.ts';

export function getFolder(db: EmailDb, accountId: number, path: string): Folder | undefined {
	const row = db
		.prepare('SELECT * FROM folders WHERE account_id = ? AND path = ?')
		.get(accountId, path) as Record<string, unknown> | undefined;
	if (!row) return undefined;
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
