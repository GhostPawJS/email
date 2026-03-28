import type { EmailDb } from '../database.ts';
import type { Message } from '../types/message.ts';
import type { MessageListOptions } from '../types/search.ts';
import { deserializeMessageRow } from './deserialize_message.ts';

const DEFAULT_LIMIT = 50;

export function listMessages(
	db: EmailDb,
	folderId: number,
	options?: MessageListOptions,
): Message[] {
	const limit = options?.limit ?? DEFAULT_LIMIT;
	const offset = options?.offset ?? 0;
	const order = options?.order === 'asc' ? 'ASC' : 'DESC';
	const sort = options?.sort ?? 'date';
	let orderColumn = '"date"';
	if (sort === 'subject') orderColumn = 'subject';
	if (sort === 'size') orderColumn = 'size';
	if (sort === 'from') orderColumn = '"from"';

	const rows = db
		.prepare(
			`
				SELECT * FROM messages
				WHERE folder_id = ?
				ORDER BY ${orderColumn} ${order}
				LIMIT ? OFFSET ?
			`,
		)
		.all(folderId, limit, offset) as Record<string, unknown>[];
	return rows.map(deserializeMessageRow);
}
