import type { EmailDb } from '../database.ts';

/**
 * Assigns `thread_id` per message: first References entry, else In-Reply-To, else Message-ID.
 */
export function computeThreads(db: EmailDb, folderId: number): void {
	const rows = db.prepare('SELECT * FROM messages WHERE folder_id = ?').all(folderId) as Record<
		string,
		unknown
	>[];
	for (const row of rows) {
		let refs: string[] = [];
		try {
			refs = row.references ? (JSON.parse(String(row.references)) as string[]) : [];
		} catch {
			refs = [];
		}
		const inReplyTo = row.in_reply_to != null ? String(row.in_reply_to) : null;
		const mid = row.message_id != null ? String(row.message_id) : null;
		let root: string | null = null;
		if (refs.length > 0) root = refs[0] ?? null;
		if (!root && inReplyTo) root = inReplyTo;
		if (!root) root = mid;
		db.prepare('UPDATE messages SET thread_id = ? WHERE id = ?').run(root, row.id);
	}
}
