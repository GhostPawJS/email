import type { EmailDb } from '../database.ts';
import type { Account } from '../types/account.ts';

export function getAccount(db: EmailDb, id: number): Account | undefined {
	const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as
		| Record<string, unknown>
		| undefined;
	if (!row) return undefined;
	return {
		id: Number(row.id),
		host: String(row.host),
		port: Number(row.port),
		username: String(row.username),
		label: row.label != null ? String(row.label) : null,
		createdAt: String(row.created_at ?? ''),
	};
}
