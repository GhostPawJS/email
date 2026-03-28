import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { createTables } from './create_tables.ts';

describe('createTables', () => {
	it('creates six tables with expected columns', () => {
		const db = new DatabaseSync(':memory:');
		createTables(db);
		const tables = db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
			)
			.all() as { name: string }[];
		const names = tables.map((t) => t.name);
		assert.ok(names.includes('accounts'));
		assert.ok(names.includes('attachments'));
		assert.ok(names.includes('bodies'));
		assert.ok(names.includes('folders'));
		assert.ok(names.includes('messages'));
		assert.ok(names.includes('sync_log'));

		const msgCols = db.prepare('PRAGMA table_info(messages)').all() as {
			name: string;
		}[];
		const colNames = msgCols.map((c) => c.name);
		assert.ok(colNames.includes('references'));
		assert.ok(colNames.includes('from'));
		db.close();
	});
});
