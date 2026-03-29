import type { EmailConfig } from '../types/config.ts';
import type { AccountEntry, AuthEntry } from './config.ts';
import { dbPathForAccount, loadAccounts } from './config.ts';
import { CliError } from './errors.ts';

export type { AccountEntry };

// ─── Account resolution ───────────────────────────────────────────────────────

/**
 * Resolves which account to use. Priority:
 *   1. explicit `name` argument (from --account flag)
 *   2. EMAIL_ACCOUNT environment variable
 *   3. configured default in accounts.json
 *   4. synthesized ephemeral account from EMAIL_* env vars (if IMAP/SMTP/USER/auth all set)
 */
export function resolveAccount(name?: string): AccountEntry {
	const slug = name ?? process.env['EMAIL_ACCOUNT'];

	// Check if full env-var config is present (ephemeral account, no file needed).
	if (!slug) {
		const envAccount = tryBuildEnvAccount();
		if (envAccount) return envAccount;
	}

	const file = loadAccounts();

	if (!file) {
		throw new CliError(
			'no_config',
			[
				'No accounts configured yet.',
				'',
				'To get started:',
				'  email account add --name work \\',
				'    --imap-host imap.example.com --imap-port 993 \\',
				'    --smtp-host smtp.example.com --smtp-port 587 \\',
				'    --user you@example.com --pass yourpassword',
				'',
				'Or set environment variables for one-off use:',
				'  EMAIL_IMAP_HOST=... EMAIL_SMTP_HOST=... EMAIL_USER=... EMAIL_PASS=... email sync connect',
			].join('\n'),
		);
	}

	const targetSlug = slug ?? file.default;

	if (!targetSlug) {
		throw new CliError(
			'no_default_account',
			'No default account set. Use --account <name> or run `email account set-default --name <name>`.',
		);
	}

	const account = file.accounts.find((a) => a.name === targetSlug);
	if (!account) {
		throw new CliError(
			'account_not_found',
			`Account "${targetSlug}" not found. Use \`email account list\` to see configured accounts.`,
		);
	}

	return applyEnvOverrides(account);
}

// ─── EmailConfig construction ─────────────────────────────────────────────────

/** Converts a stored AccountEntry into the EmailConfig the Mailbox constructor expects. */
export function buildEmailConfig(account: AccountEntry): EmailConfig {
	const auth = buildAuthConfig(account.auth);

	const imap =
		account.imap.tls !== undefined
			? { host: account.imap.host, port: account.imap.port, tls: account.imap.tls }
			: { host: account.imap.host, port: account.imap.port };

	const smtp =
		account.smtp.tls !== undefined
			? { host: account.smtp.host, port: account.smtp.port, tls: account.smtp.tls }
			: { host: account.smtp.host, port: account.smtp.port };

	const config: EmailConfig = {
		imap,
		smtp,
		auth,
		storage: dbPathForAccount(account.name),
	};

	if (account.identities) config.identities = account.identities;

	return config;
}

function buildAuthConfig(auth: AuthEntry): EmailConfig['auth'] {
	if (auth.type === 'password') {
		return { user: auth.user, pass: auth.pass };
	}
	if (auth.type === 'oauth2') {
		if (auth.refreshToken !== undefined) {
			return { user: auth.user, accessToken: auth.accessToken, refreshToken: auth.refreshToken };
		}
		return { user: auth.user, accessToken: auth.accessToken };
	}
	return { mechanism: auth.mechanism, credentials: auth.credentials };
}

// ─── Env var helpers ──────────────────────────────────────────────────────────

function tryBuildEnvAccount(): AccountEntry | null {
	const imapHost = process.env['EMAIL_IMAP_HOST'];
	const smtpHost = process.env['EMAIL_SMTP_HOST'];
	const user = process.env['EMAIL_USER'];
	const pass = process.env['EMAIL_PASS'];
	const accessToken = process.env['EMAIL_ACCESS_TOKEN'];

	if (!imapHost || !smtpHost || !user || (!pass && !accessToken)) return null;

	const imapPort = parsePort(process.env['EMAIL_IMAP_PORT'], 993);
	const smtpPort = parsePort(process.env['EMAIL_SMTP_PORT'], 587);
	const imapTls = process.env['EMAIL_IMAP_TLS'] !== 'false';
	const smtpTls = process.env['EMAIL_SMTP_TLS'] !== 'false';

	let auth: AuthEntry;
	if (accessToken) {
		const refreshToken = process.env['EMAIL_REFRESH_TOKEN'];
		auth = refreshToken
			? { type: 'oauth2', user, accessToken, refreshToken }
			: { type: 'oauth2', user, accessToken };
	} else {
		auth = { type: 'password', user, pass: pass! };
	}

	return {
		name: 'env',
		imap: { host: imapHost, port: imapPort, tls: imapTls },
		smtp: { host: smtpHost, port: smtpPort, tls: smtpTls },
		auth,
	};
}

function applyEnvOverrides(account: AccountEntry): AccountEntry {
	const result: AccountEntry = {
		...account,
		imap: { ...account.imap },
		smtp: { ...account.smtp },
		auth: { ...account.auth },
	};

	if (process.env['EMAIL_IMAP_HOST']) result.imap.host = process.env['EMAIL_IMAP_HOST'];
	if (process.env['EMAIL_IMAP_PORT'])
		result.imap.port = parsePort(process.env['EMAIL_IMAP_PORT'], result.imap.port);
	if (process.env['EMAIL_IMAP_TLS'] !== undefined)
		result.imap.tls = process.env['EMAIL_IMAP_TLS'] !== 'false';
	if (process.env['EMAIL_SMTP_HOST']) result.smtp.host = process.env['EMAIL_SMTP_HOST'];
	if (process.env['EMAIL_SMTP_PORT'])
		result.smtp.port = parsePort(process.env['EMAIL_SMTP_PORT'], result.smtp.port);
	if (process.env['EMAIL_SMTP_TLS'] !== undefined)
		result.smtp.tls = process.env['EMAIL_SMTP_TLS'] !== 'false';

	const user = process.env['EMAIL_USER'];
	const pass = process.env['EMAIL_PASS'];
	const accessToken = process.env['EMAIL_ACCESS_TOKEN'];

	if (user && pass) result.auth = { type: 'password', user, pass };
	else if (user && accessToken) {
		const refreshToken = process.env['EMAIL_REFRESH_TOKEN'];
		result.auth = refreshToken
			? { type: 'oauth2', user, accessToken, refreshToken }
			: { type: 'oauth2', user, accessToken };
	}

	return result;
}

function parsePort(val: string | undefined, fallback: number): number {
	if (!val) return fallback;
	const n = parseInt(val, 10);
	return Number.isFinite(n) && n > 0 ? n : fallback;
}
