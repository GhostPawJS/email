import type { EmailDb } from '../database.ts';
import type { Message } from '../types/message.ts';
import { deserializeMessageRow } from './deserialize_message.ts';

export function getMessage(db: EmailDb, folderId: number, uid: number): Message | undefined {
	const row = db
		.prepare('SELECT * FROM messages WHERE folder_id = ? AND uid = ?')
		.get(folderId, uid) as Record<string, unknown> | undefined;
	if (!row) return undefined;
	return deserializeMessageRow(row);
}
