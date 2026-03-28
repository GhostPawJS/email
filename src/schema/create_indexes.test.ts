import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { createIndexes } from './create_indexes.ts';
import { createTables } from './create_tables.ts';

describe('createIndexes', () => {
	it('creates seven indexes', () => {
		const db = new DatabaseSync(':memory:');
		createTables(db);
		createIndexes(db);
		const idx = db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name",
			)
			.all() as { name: string }[];
		assert.equal(idx.length, 7);
		db.close();
	});
});
