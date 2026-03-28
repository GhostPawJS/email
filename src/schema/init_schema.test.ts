import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from './init_schema.ts';

describe('initSchema', () => {
	it('is idempotent', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		initSchema(db);
		const tables = db
			.prepare(
				"SELECT COUNT(*) as c FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
			)
			.get() as { c: number };
		assert.ok(tables.c >= 6);
		db.close();
	});
});
