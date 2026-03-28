import type { EmailDb } from '../database.ts';
import type { Message } from '../types/message.ts';
import { deserializeMessageRow } from './deserialize_message.ts';

export function getMessageById(db: EmailDb, id: number): Message | undefined {
	const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as
		| Record<string, unknown>
		| undefined;
	if (!row) return undefined;
	return deserializeMessageRow(row);
}
