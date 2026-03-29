import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { ConfigError, getConfigDir, loadAccounts, validateAccounts } from './config.ts';

// ─── validateAccounts ─────────────────────────────────────────────────────────

describe('validateAccounts', () => {
	it('accepts a valid password account', () => {
		const data = {
			version: 1,
			default: 'work',
			accounts: [
				{
					name: 'work',
					imap: { host: 'imap.example.com', port: 993, tls: true },
					smtp: { host: 'smtp.example.com', port: 587, tls: true },
					auth: { type: 'password', user: 'me@example.com', pass: 'secret' },
				},
			],
		};
		const result = validateAccounts(data);
		assert.equal(result.version, 1);
		assert.equal(result.default, 'work');
		assert.equal(result.accounts.length, 1);
		assert.equal(result.accounts[0]!.name, 'work');
	});

	it('accepts a valid oauth2 account', () => {
		const data = {
			version: 1,
			default: 'personal',
			accounts: [
				{
					name: 'personal',
					imap: { host: 'imap.gmail.com', port: 993 },
					smtp: { host: 'smtp.gmail.com', port: 587 },
					auth: { type: 'oauth2', user: 'me@gmail.com', accessToken: 'tok' },
				},
			],
		};
		const result = validateAccounts(data);
		assert.equal(result.accounts[0]!.auth.type, 'oauth2');
	});

	it('throws config_malformed for non-object input', () => {
		assert.throws(
			() => validateAccounts('string'),
			(e) => e instanceof ConfigError && e.code === 'config_malformed',
		);
		assert.throws(
			() => validateAccounts(null),
			(e) => e instanceof ConfigError,
		);
		assert.throws(
			() => validateAccounts([]),
			(e) => e instanceof ConfigError,
		);
	});

	it('throws config_version_unknown for unknown version', () => {
		assert.throws(
			() => validateAccounts({ version: 2, default: null, accounts: [] }),
			(e) => e instanceof ConfigError && e.code === 'config_version_unknown',
		);
	});

	it('throws config_malformed when accounts is not an array', () => {
		assert.throws(
			() => validateAccounts({ version: 1, default: null, accounts: 'bad' }),
			(e) => e instanceof ConfigError && e.code === 'config_malformed',
		);
	});

	it('throws config_malformed for duplicate account names', () => {
		const data = {
			version: 1,
			default: 'work',
			accounts: [
				{
					name: 'work',
					imap: { host: 'h', port: 993 },
					smtp: { host: 'h', port: 587 },
					auth: { type: 'password', user: 'u', pass: 'p' },
				},
				{
					name: 'work',
					imap: { host: 'h', port: 993 },
					smtp: { host: 'h', port: 587 },
					auth: { type: 'password', user: 'u', pass: 'p' },
				},
			],
		};
		assert.throws(
			() => validateAccounts(data),
			(e) => e instanceof ConfigError && e.code === 'config_malformed',
		);
	});

	it('throws config_malformed for orphaned default', () => {
		const data = {
			version: 1,
			default: 'nonexistent',
			accounts: [
				{
					name: 'work',
					imap: { host: 'h', port: 993 },
					smtp: { host: 'h', port: 587 },
					auth: { type: 'password', user: 'u', pass: 'p' },
				},
			],
		};
		assert.throws(
			() => validateAccounts(data),
			(e) => e instanceof ConfigError && e.code === 'config_malformed',
		);
	});

	it('throws account_invalid for invalid account name', () => {
		const data = {
			version: 1,
			default: null,
			accounts: [
				{
					name: 'UPPER',
					imap: { host: 'h', port: 993 },
					smtp: { host: 'h', port: 587 },
					auth: { type: 'password', user: 'u', pass: 'p' },
				},
			],
		};
		assert.throws(
			() => validateAccounts(data),
			(e) => e instanceof ConfigError && e.code === 'account_invalid',
		);
	});

	it('throws account_invalid for missing imap.host', () => {
		const data = {
			version: 1,
			default: null,
			accounts: [
				{
					name: 'work',
					imap: { port: 993 },
					smtp: { host: 'h', port: 587 },
					auth: { type: 'password', user: 'u', pass: 'p' },
				},
			],
		};
		assert.throws(
			() => validateAccounts(data),
			(e) => e instanceof ConfigError && e.code === 'account_invalid',
		);
	});

	it('throws account_invalid for unknown auth type', () => {
		const data = {
			version: 1,
			default: null,
			accounts: [
				{
					name: 'work',
					imap: { host: 'h', port: 993 },
					smtp: { host: 'h', port: 587 },
					auth: { type: 'magic', user: 'u' },
				},
			],
		};
		assert.throws(
			() => validateAccounts(data),
			(e) => e instanceof ConfigError && e.code === 'account_invalid',
		);
	});

	it('accepts null default', () => {
		const data = { version: 1, default: null, accounts: [] };
		const result = validateAccounts(data);
		assert.equal(result.default, null);
	});

	it('preserves optional label and identities', () => {
		const data = {
			version: 1,
			default: 'work',
			accounts: [
				{
					name: 'work',
					label: 'Work Account',
					imap: { host: 'h', port: 993 },
					smtp: { host: 'h', port: 587 },
					auth: { type: 'password', user: 'u', pass: 'p' },
					identities: [{ name: 'Me', address: 'me@example.com' }],
				},
			],
		};
		const result = validateAccounts(data);
		assert.equal(result.accounts[0]!.label, 'Work Account');
		assert.equal(result.accounts[0]!.identities?.[0]?.address, 'me@example.com');
	});
});

// ─── XDG path resolution ──────────────────────────────────────────────────────

describe('path resolution', () => {
	let tmpDir: string;
	let originalConfigDir: string | undefined;
	let originalDataDir: string | undefined;

	before(() => {
		tmpDir = join(tmpdir(), `email-test-${Date.now()}`);
		mkdirSync(tmpDir, { recursive: true });
		originalConfigDir = process.env['EMAIL_CONFIG_DIR'];
		originalDataDir = process.env['EMAIL_DATA_DIR'];
	});

	after(() => {
		rmSync(tmpDir, { recursive: true, force: true });
		if (originalConfigDir !== undefined) process.env['EMAIL_CONFIG_DIR'] = originalConfigDir;
		else delete process.env['EMAIL_CONFIG_DIR'];
		if (originalDataDir !== undefined) process.env['EMAIL_DATA_DIR'] = originalDataDir;
		else delete process.env['EMAIL_DATA_DIR'];
	});

	it('getConfigDir respects EMAIL_CONFIG_DIR env var', () => {
		process.env['EMAIL_CONFIG_DIR'] = tmpDir;
		assert.equal(getConfigDir(), tmpDir);
	});

	it('loadAccounts returns null when file does not exist', () => {
		process.env['EMAIL_CONFIG_DIR'] = tmpDir;
		// tmpDir has no accounts.json at this point.
		const result = loadAccounts();
		assert.equal(result, null);
	});

	it('loadAccounts throws config_malformed for invalid JSON', () => {
		// EMAIL_CONFIG_DIR is the full path to the config dir, so accounts.json
		// lives directly inside it (not in an 'email' subdirectory).
		const dir = join(tmpDir, 'bad-json');
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, 'accounts.json'), 'not json', 'utf-8');
		process.env['EMAIL_CONFIG_DIR'] = dir;
		assert.throws(
			() => loadAccounts(),
			(e) => e instanceof ConfigError && e.code === 'config_malformed',
		);
	});
});
