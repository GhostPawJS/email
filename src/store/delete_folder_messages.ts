import type { EmailDb } from '../database.ts';

export function deleteFolderMessages(db: EmailDb, folderId: number): void {
	db.prepare('DELETE FROM messages WHERE folder_id = ?').run(folderId);
}
