import type { EmailDb } from '../database.ts';
import type { AccountStats } from '../types/stats.ts';

export function getStats(db: EmailDb, accountId: number): AccountStats {
	const folders = db
		.prepare(
			`
				SELECT path, role, COALESCE(message_count, 0) as total,
					COALESCE(unseen_count, 0) as unread
				FROM folders WHERE account_id = ?
			`,
		)
		.all(accountId) as {
		path: string;
		role: string | null;
		total: number;
		unread: number;
	}[];
	const totals = db
		.prepare(
			`
				SELECT COUNT(*) as total_messages
				FROM messages m
				INNER JOIN folders f ON m.folder_id = f.id
				WHERE f.account_id = ?
			`,
		)
		.get(accountId) as { total_messages: number };
	const unreadRow = db
		.prepare(
			`
				SELECT COALESCE(SUM(unseen_count), 0) as total_unread
				FROM folders WHERE account_id = ?
			`,
		)
		.get(accountId) as { total_unread: number };
	const page = db.prepare('PRAGMA page_count').get() as { page_count: number };
	const size = db.prepare('PRAGMA page_size').get() as { page_size: number };
	const storageUsed = page.page_count * size.page_size;
	const last = db
		.prepare(
			`
				SELECT MAX(last_synced_at) as last FROM folders WHERE account_id = ?
			`,
		)
		.get(accountId) as { last: string | null };
	return {
		folders: folders.map((fo) => ({
			path: fo.path,
			role: fo.role,
			total: fo.total,
			unread: fo.unread,
		})),
		totalMessages: totals.total_messages,
		totalUnread: unreadRow.total_unread,
		lastSyncedAt: last.last,
		storageUsed,
	};
}
