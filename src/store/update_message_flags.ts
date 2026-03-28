import type { EmailDb } from '../database.ts';

export function updateMessageFlags(
	db: EmailDb,
	folderId: number,
	uid: number,
	flags: string[],
): void {
	db.prepare(
		`
			UPDATE messages SET flags = ? WHERE folder_id = ? AND uid = ?
		`,
	).run(JSON.stringify(flags), folderId, uid);
}
