import type { EmailDb } from '../database.ts';
import type { Account } from '../types/account.ts';

export function listAccounts(db: EmailDb): Account[] {
	const rows = db.prepare('SELECT * FROM accounts ORDER BY id').all() as Record<string, unknown>[];
	return rows.map((row) => ({
		id: Number(row.id),
		host: String(row.host),
		port: Number(row.port),
		username: String(row.username),
		label: row.label != null ? String(row.label) : null,
		createdAt: String(row.created_at ?? ''),
	}));
}
