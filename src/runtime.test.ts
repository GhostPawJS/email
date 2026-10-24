import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { init } from './runtime.ts';

describe('init', () => {
	it('creates an in-memory db with schema applied', () => {
		const { db } = init({
			imap: { host: 'imap.example.com', port: 993 },
			smtp: { host: 'smtp.example.com', port: 587 },
			auth: { user: 'u', pass: 'p' },
		});
		// Schema should be in place — accounts table exists
		const row = db
			.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'")
			.get() as Record<string, unknown> | undefined;
		assert.ok(row, 'accounts table should exist after init');
		db.close();
	});

	it('uses storage path from config when provided', () => {
		const { db } = init({
			imap: { host: 'imap.example.com', port: 993 },
			smtp: { host: 'smtp.example.com', port: 587 },
			auth: { user: 'u', pass: 'p' },
			storage: ':memory:',
		});
		assert.ok(db);
		db.close();
	});
});

it('configures file databases for WAL and a five second busy timeout', () => {
	const directory = mkdtempSync(join(tmpdir(), 'email-runtime-'));
	try {
		const { db } = init({
			imap: { host: 'localhost', port: 993 },
			smtp: { host: 'localhost', port: 587 },
			auth: { user: 'u', pass: 'p' },
			storage: join(directory, 'cache.sqlite'),
		});
		try {
			assert.equal(
				(db.prepare('PRAGMA journal_mode').get() as { journal_mode: string }).journal_mode,
				'wal',
			);
			assert.equal((db.prepare('PRAGMA busy_timeout').get() as { timeout: number }).timeout, 5000);
		} finally {
			db.close();
		}
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

it('imports the public source entry without loading SQLite or printing output', () => {
	const entry = new URL('./index.ts', import.meta.url).href;
	const result = spawnSync(
		process.execPath,
		[
			'--experimental-strip-types',
			'--input-type=module',
			'-e',
			`await import(${JSON.stringify(entry)});`,
		],
		{ encoding: 'utf8' },
	);
	assert.equal(result.status, 0, result.stderr);
	assert.equal(result.stdout, '');
	assert.equal(result.stderr, '');
});
