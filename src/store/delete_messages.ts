import type { EmailDb } from '../database.ts';

export function deleteMessages(db: EmailDb, folderId: number, uids: readonly number[]): void {
	if (uids.length === 0) return;
	const placeholders = uids.map(() => '?').join(', ');
	db.prepare(`DELETE FROM messages WHERE folder_id = ? AND uid IN (${placeholders})`).run(
		folderId,
		...uids,
	);
}
