import type { EmailDb } from '../database.ts';

export function deleteAccount(db: EmailDb, id: number): void {
	db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
}
