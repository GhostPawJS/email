import type { EmailDb } from '../database.ts';
import type { Message } from '../types/message.ts';
import type { LocalSearchOptions } from '../types/search.ts';
import { deserializeMessageRow } from './deserialize_message.ts';

export function searchMessages(
	db: EmailDb,
	query: string,
	options?: LocalSearchOptions,
): Message[] {
	const limit = options?.limit ?? 50;
	let sql = `
		SELECT m.* FROM messages m
		WHERE m.id IN (SELECT rowid FROM messages_fts WHERE messages_fts MATCH ?)
	`;
	const params: unknown[] = [query];
	if (options?.folder) {
		sql += ' AND EXISTS (SELECT 1 FROM folders f WHERE f.id = m.folder_id AND f.path = ?)';
		params.push(options.folder);
	}
	sql += ' LIMIT ?';
	params.push(limit);
	const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
	return rows.map(deserializeMessageRow);
}
