import type { EmailDb } from '../database.ts';
import type { Account } from '../types/account.ts';

export type UpsertAccountInput = {
	id?: number;
	host: string;
	port: number;
	username: string;
	label?: string | null;
};

export function upsertAccount(db: EmailDb, input: UpsertAccountInput): Account {
	if (input.id !== undefined) {
		db.prepare(
			`
				INSERT OR REPLACE INTO accounts (id, host, port, username, label, created_at)
				VALUES (
					?,
					?,
					?,
					?,
					?,
					COALESCE((SELECT created_at FROM accounts WHERE id = ?), datetime('now'))
				)
			`,
		).run(input.id, input.host, input.port, input.username, input.label ?? null, input.id);
		const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(input.id) as
			| Record<string, unknown>
			| undefined;
		if (!row) {
			throw new Error('upsertAccount: row missing after replace');
		}
		return mapAccount(row);
	}

	const result = db
		.prepare(
			`
				INSERT INTO accounts (host, port, username, label)
				VALUES (?, ?, ?, ?)
			`,
		)
		.run(input.host, input.port, input.username, input.label ?? null);
	const id = Number(result.lastInsertRowid);
	const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as Record<string, unknown>;
	return mapAccount(row);
}

function mapAccount(row: Record<string, unknown>): Account {
	return {
		id: Number(row.id),
		host: String(row.host),
		port: Number(row.port),
		username: String(row.username),
		label: row.label != null ? String(row.label) : null,
		createdAt: String(row.created_at ?? ''),
	};
}
