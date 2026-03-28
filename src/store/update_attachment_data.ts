import type { EmailDb } from '../database.ts';

export function updateAttachmentData(db: EmailDb, attachmentId: number, data: Buffer): void {
	db.prepare('UPDATE attachments SET data = ? WHERE id = ?').run(data, attachmentId);
}
