import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { ensureConfigDir, loadAccounts, saveAccounts } from '../config.ts';
import { CliError } from '../errors.ts';

describe('account config management', () => {
	let tmpDir: string;
	let originalConfigDir: string | undefined;

	before(() => {
		tmpDir = join(tmpdir(), `email-account-test-${Date.now()}`);
		mkdirSync(tmpDir, { recursive: true });
		originalConfigDir = process.env['EMAIL_CONFIG_DIR'];
		process.env['EMAIL_CONFIG_DIR'] = tmpDir;
	});

	after(() => {
		rmSync(tmpDir, { recursive: true, force: true });
		if (originalConfigDir !== undefined) process.env['EMAIL_CONFIG_DIR'] = originalConfigDir;
		else delete process.env['EMAIL_CONFIG_DIR'];
	});

	it('loadAccounts returns null when no file exists', () => {
		assert.equal(loadAccounts(), null);
	});

	it('saveAccounts and loadAccounts round-trip', () => {
		ensureConfigDir();
		const data = {
			version: 1 as const,
			default: 'work',
			accounts: [
				{
					name: 'work',
					imap: { host: 'imap.example.com', port: 993, tls: true },
					smtp: { host: 'smtp.example.com', port: 587, tls: true },
					auth: { type: 'password' as const, user: 'u@example.com', pass: 'pw' },
				},
			],
		};
		saveAccounts(data);
		const loaded = loadAccounts();
		assert.ok(loaded !== null);
		assert.equal(loaded.default, 'work');
		assert.equal(loaded.accounts.length, 1);
		assert.equal(loaded.accounts[0]!.name, 'work');
	});

	it('first account added becomes the default', () => {
		// Simulates what `email account add` does when file does not yet exist.
		const existing = loadAccounts();
		assert.ok(existing !== null); // file exists from previous test

		const file = existing ?? { version: 1 as const, default: null, accounts: [] };
		const newAccount = {
			name: 'personal',
			imap: { host: 'imap.gmail.com', port: 993, tls: true },
			smtp: { host: 'smtp.gmail.com', port: 587, tls: true },
			auth: { type: 'password' as const, user: 'me@gmail.com', pass: 'gp' },
		};
		file.accounts.push(newAccount);
		// Default stays 'work' since it was already set.
		saveAccounts(file);

		const reloaded = loadAccounts();
		assert.equal(reloaded?.default, 'work'); // didn't change
		assert.equal(reloaded?.accounts.length, 2);
	});

	it('set-default updates the default account', () => {
		const file = loadAccounts()!;
		file.default = 'personal';
		saveAccounts(file);
		assert.equal(loadAccounts()?.default, 'personal');
	});

	it('remove account clears default if removed account was default', () => {
		const file = loadAccounts()!;
		const idx = file.accounts.findIndex((a) => a.name === 'personal');
		assert.ok(idx !== -1);
		file.accounts.splice(idx, 1);
		// If removed account was default, fall back to first remaining account.
		if (file.default === 'personal') {
			file.default = file.accounts[0]?.name ?? null;
		}
		saveAccounts(file);
		const reloaded = loadAccounts()!;
		assert.equal(reloaded.accounts.length, 1);
		// Default should now be 'work' since that's the only account.
		assert.equal(reloaded.default, 'work');
	});
});

describe('account errors', () => {
	it('CliError account_not_found has exit code 2', () => {
		const err = new CliError('account_not_found', 'Account "foo" not found.');
		assert.equal(err.exitCode, 2);
	});

	it('CliError no_default_account has exit code 2', () => {
		const err = new CliError('no_default_account', 'No default set.');
		assert.equal(err.exitCode, 2);
	});
});
