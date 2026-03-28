import type { EmailDb } from '../database.ts';
import type { Folder, FolderRole } from '../types/folder.ts';

export type UpsertFolderInput = {
	accountId: number;
	path: string;
	delimiter?: string;
	role?: FolderRole;
	uidValidity?: number | null;
	uidNext?: number | null;
	highestModSeq?: number | null;
	messageCount?: number | null;
	unseenCount?: number | null;
	lastSyncedAt?: string | null;
};

export function upsertFolder(db: EmailDb, input: UpsertFolderInput): Folder {
	const delimiter = input.delimiter ?? '/';
	db.prepare(
		`
			INSERT INTO folders (
				account_id, path, delimiter, role,
				uid_validity, uid_next, highest_mod_seq,
				message_count, unseen_count, last_synced_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(account_id, path) DO UPDATE SET
				delimiter = excluded.delimiter,
				role = excluded.role,
				uid_validity = excluded.uid_validity,
				uid_next = excluded.uid_next,
				highest_mod_seq = excluded.highest_mod_seq,
				message_count = excluded.message_count,
				unseen_count = excluded.unseen_count,
				last_synced_at = excluded.last_synced_at
		`,
	).run(
		input.accountId,
		input.path,
		delimiter,
		input.role ?? null,
		input.uidValidity ?? null,
		input.uidNext ?? null,
		input.highestModSeq ?? null,
		input.messageCount ?? null,
		input.unseenCount ?? null,
		input.lastSyncedAt ?? null,
	);
	const row = db
		.prepare('SELECT * FROM folders WHERE account_id = ? AND path = ?')
		.get(input.accountId, input.path) as Record<string, unknown>;
	return mapFolder(row);
}

function mapFolder(row: Record<string, unknown>): Folder {
	return {
		id: Number(row.id),
		accountId: Number(row.account_id),
		path: String(row.path),
		delimiter: String(row.delimiter),
		role: row.role != null ? (String(row.role) as Folder['role']) : null,
		uidValidity: row.uid_validity != null ? Number(row.uid_validity) : null,
		uidNext: row.uid_next != null ? Number(row.uid_next) : null,
		highestModSeq: row.highest_mod_seq != null ? Number(row.highest_mod_seq) : null,
		messageCount: row.message_count != null ? Number(row.message_count) : null,
		unseenCount: row.unseen_count != null ? Number(row.unseen_count) : null,
		lastSyncedAt: row.last_synced_at != null ? String(row.last_synced_at) : null,
	};
}
