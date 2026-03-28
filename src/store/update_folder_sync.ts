import type { EmailDb } from '../database.ts';

export type FolderSyncMeta = {
	uidValidity?: number | null;
	uidNext?: number | null;
	highestModSeq?: number | null;
	messageCount?: number | null;
	unseenCount?: number | null;
	lastSyncedAt?: string | null;
};

export function updateFolderSync(db: EmailDb, folderId: number, meta: FolderSyncMeta): void {
	const sets: string[] = [];
	const params: unknown[] = [];
	if (meta.uidValidity !== undefined) {
		sets.push('uid_validity = ?');
		params.push(meta.uidValidity);
	}
	if (meta.uidNext !== undefined) {
		sets.push('uid_next = ?');
		params.push(meta.uidNext);
	}
	if (meta.highestModSeq !== undefined) {
		sets.push('highest_mod_seq = ?');
		params.push(meta.highestModSeq);
	}
	if (meta.messageCount !== undefined) {
		sets.push('message_count = ?');
		params.push(meta.messageCount);
	}
	if (meta.unseenCount !== undefined) {
		sets.push('unseen_count = ?');
		params.push(meta.unseenCount);
	}
	if (meta.lastSyncedAt !== undefined) {
		sets.push('last_synced_at = ?');
		params.push(meta.lastSyncedAt);
	}
	if (sets.length === 0) return;
	params.push(folderId);
	db.prepare(`UPDATE folders SET ${sets.join(', ')} WHERE id = ?`).run(...params);
}
