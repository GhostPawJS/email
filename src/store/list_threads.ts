import type { EmailDb } from '../database.ts';
import type { ThreadListOptions } from '../types/search.ts';
import type { Thread } from '../types/thread.ts';
import { getThread } from './get_thread.ts';

export function listThreads(db: EmailDb, folderId: number, options?: ThreadListOptions): Thread[] {
	const limit = options?.limit ?? 50;
	const offset = options?.offset ?? 0;
	const rows = db
		.prepare(
			`
				SELECT thread_id, MAX(COALESCE("date", received_at)) as last_d
				FROM messages
				WHERE folder_id = ? AND thread_id IS NOT NULL
				GROUP BY thread_id
				ORDER BY last_d DESC
				LIMIT ? OFFSET ?
			`,
		)
		.all(folderId, limit, offset) as { thread_id: string }[];
	return rows
		.map((r) => r.thread_id)
		.filter((id): id is string => id != null && id !== '')
		.map((threadId) => getThread(db, threadId));
}
