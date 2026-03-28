import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import type { EmailDb } from './database.ts';

test('DatabaseSync satisfies the EmailDb contract', () => {
	const db: EmailDb = new DatabaseSync(':memory:');

	try {
		db.exec('CREATE TABLE sample (value TEXT NOT NULL);');
		db.prepare('INSERT INTO sample (value) VALUES (?)').run('ok');

		const row = db.prepare('SELECT value FROM sample').get<{ value: string }>();
		assert.equal(row?.value, 'ok');
	} finally {
		db.close();
	}
});
