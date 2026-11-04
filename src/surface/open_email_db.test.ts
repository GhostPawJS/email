import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { openEmailDb } from './open_email_db.ts';

test('opens nested paths, initializes schema and configures WAL and timeout', async () => {
	const directory = mkdtempSync(join(tmpdir(), 'email-db-'));
	try {
		const db = await openEmailDb(join(directory, 'nested', 'email.db'));
		try {
			assert.equal(
				db.prepare('PRAGMA journal_mode').get<{ journal_mode: string }>()?.journal_mode,
				'wal',
			);
			assert.equal(db.prepare('PRAGMA busy_timeout').get<{ timeout: number }>()?.timeout, 5000);
			assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE name = 'accounts'").get());
		} finally {
			db.close();
		}
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
	const db = await openEmailDb(':memory:');
	db.close();
});

test('database callers receive a clear directory error', async () => {
	const directory = mkdtempSync(join(tmpdir(), 'email-db-'));
	try {
		const file = join(directory, 'file');
		writeFileSync(file, '');
		await assert.rejects(openEmailDb(join(file, 'nested', 'email.db')), {
			message: `Cannot create database directory ${join(file, 'nested')}: a path component is not a directory`,
		});
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
