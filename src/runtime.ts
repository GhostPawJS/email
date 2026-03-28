import { DatabaseSync } from 'node:sqlite';
import type { EmailDb } from './database.ts';
import { initSchema } from './schema/index.ts';
import type { EmailConfig } from './types/config.ts';

export function init(config: EmailConfig): { db: EmailDb } {
	const dbPath = config.storage ?? ':memory:';
	const db = new DatabaseSync(dbPath) as EmailDb;
	initSchema(db);
	return { db };
}
