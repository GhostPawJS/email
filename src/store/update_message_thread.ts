import type { EmailDb } from '../database.ts';

export function updateMessageThread(db: EmailDb, messageId: number, threadId: string): void {
	db.prepare('UPDATE messages SET thread_id = ? WHERE id = ?').run(threadId, messageId);
}
