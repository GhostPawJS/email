import assert from 'node:assert/strict';
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
