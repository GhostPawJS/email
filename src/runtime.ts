import type * as SQLite from 'node:sqlite';
import type { EmailDb } from './database.ts';
import { preparePrivateStorage, withPrivateCreation } from './private_storage.ts';
import { initSchema } from './schema/index.ts';
import type { EmailConfig } from './types/config.ts';

export function init(config: EmailConfig): { db: EmailDb } {
	const dbPath = config.storage ?? ':memory:';
	const { DatabaseSync } = process.getBuiltinModule('node:sqlite') as typeof SQLite;
	const secure = dbPath !== ':memory:' ? preparePrivateStorage(dbPath) : undefined;
	return withPrivateCreation(() => {
		const db = new DatabaseSync(dbPath) as EmailDb;
		if (dbPath !== ':memory:') db.exec('PRAGMA journal_mode=WAL');
		db.exec('PRAGMA busy_timeout=5000');
		initSchema(db);
		return { db };
	}, secure);
}
