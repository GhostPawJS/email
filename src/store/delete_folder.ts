import type { EmailDb } from '../database.ts';

export function deleteFolder(db: EmailDb, folderId: number): void {
	db.prepare('DELETE FROM folders WHERE id = ?').run(folderId);
}
