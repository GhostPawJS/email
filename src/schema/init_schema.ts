import type { EmailDb } from '../database.ts';
import { createFts } from './create_fts.ts';
import { createIndexes } from './create_indexes.ts';
import { createTables } from './create_tables.ts';

export function initSchema(db: EmailDb): void {
	createTables(db);
	createFts(db);
	createIndexes(db);
}
