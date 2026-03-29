import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { buildEmailConfig } from './account.ts';
import type { AccountEntry } from './config.ts';
import { CliError } from './errors.ts';

// ─── buildEmailConfig ─────────────────────────────────────────────────────────

const baseAccount: AccountEntry = {
	name: 'work',
	imap: { host: 'imap.example.com', port: 993, tls: true },
	smtp: { host: 'smtp.example.com', port: 587, tls: true },
	auth: { type: 'password', user: 'me@example.com', pass: 'secret' },
};

describe('buildEmailConfig', () => {
	it('maps password auth correctly', () => {
		const config = buildEmailConfig(baseAccount);
		assert.ok('pass' in config.auth);
		assert.equal((config.auth as { user: string; pass: string }).pass, 'secret');
	});

	it('maps oauth2 auth without refreshToken', () => {
		const account: AccountEntry = {
			...baseAccount,
			auth: { type: 'oauth2', user: 'me@example.com', accessToken: 'tok123' },
		};
		const config = buildEmailConfig(account);
		const auth = config.auth as { user: string; accessToken: string; refreshToken?: string };
		assert.equal(auth.accessToken, 'tok123');
		assert.equal(auth.refreshToken, undefined);
	});

	it('maps oauth2 auth with refreshToken', () => {
		const account: AccountEntry = {
			...baseAccount,
			auth: { type: 'oauth2', user: 'me@example.com', accessToken: 'tok', refreshToken: 'ref' },
		};
		const config = buildEmailConfig(account);
		const auth = config.auth as { refreshToken?: string };
		assert.equal(auth.refreshToken, 'ref');
	});

	it('maps sasl auth correctly', () => {
		const account: AccountEntry = {
			...baseAccount,
			auth: { type: 'sasl', mechanism: 'GSSAPI', credentials: { user: 'u' } },
		};
		const config = buildEmailConfig(account);
		const auth = config.auth as { mechanism: string };
		assert.equal(auth.mechanism, 'GSSAPI');
	});

	it('sets storage to db path for account name', () => {
		const config = buildEmailConfig(baseAccount);
		assert.ok(config.storage?.includes('work.db'));
	});

	it('omits tls when undefined', () => {
		const account: AccountEntry = {
			...baseAccount,
			imap: { host: 'imap.example.com', port: 993 },
		};
		const config = buildEmailConfig(account);
		assert.equal(config.imap.tls, undefined);
	});

	it('includes identities when present', () => {
		const account: AccountEntry = {
			...baseAccount,
			identities: [{ name: 'Me', address: 'me@example.com' }],
		};
		const config = buildEmailConfig(account);
		assert.equal(config.identities?.[0]?.address, 'me@example.com');
	});
});

// ─── resolveAccount with env vars ────────────────────────────────────────────

describe('resolveAccount with full env vars (ephemeral account)', () => {
	before(() => {
		process.env['EMAIL_IMAP_HOST'] = 'imap.test.com';
		process.env['EMAIL_SMTP_HOST'] = 'smtp.test.com';
		process.env['EMAIL_USER'] = 'test@test.com';
		process.env['EMAIL_PASS'] = 'testpass';
		// Avoid reading real config file.
		process.env['EMAIL_CONFIG_DIR'] = '/tmp/nonexistent-test-dir-xyz';
	});

	after(() => {
		delete process.env['EMAIL_IMAP_HOST'];
		delete process.env['EMAIL_SMTP_HOST'];
		delete process.env['EMAIL_USER'];
		delete process.env['EMAIL_PASS'];
		delete process.env['EMAIL_CONFIG_DIR'];
	});

	it('synthesizes ephemeral account from env vars when no config exists', async () => {
		const { resolveAccount } = await import('./account.ts');
		const account = resolveAccount();
		assert.equal(account.name, 'env');
		assert.equal(account.imap.host, 'imap.test.com');
		assert.equal(account.smtp.host, 'smtp.test.com');
		assert.equal((account.auth as { user: string }).user, 'test@test.com');
	});
});

describe('resolveAccount errors', () => {
	before(() => {
		process.env['EMAIL_CONFIG_DIR'] = '/tmp/nonexistent-test-dir-xyz';
		delete process.env['EMAIL_IMAP_HOST'];
		delete process.env['EMAIL_SMTP_HOST'];
		delete process.env['EMAIL_USER'];
		delete process.env['EMAIL_PASS'];
	});

	after(() => {
		delete process.env['EMAIL_CONFIG_DIR'];
	});

	it('throws no_config CliError when no config and no env vars', async () => {
		const { resolveAccount } = await import('./account.ts');
		assert.throws(
			() => resolveAccount(),
			(e) => e instanceof CliError && e.code === 'no_config',
		);
	});
});
