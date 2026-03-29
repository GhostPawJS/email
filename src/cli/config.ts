import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthEntry =
	| { type: 'password'; user: string; pass: string }
	| { type: 'oauth2'; user: string; accessToken: string; refreshToken?: string }
	| { type: 'sasl'; mechanism: string; credentials: Record<string, string> };

export type AccountEntry = {
	name: string;
	label?: string;
	imap: { host: string; port: number; tls?: boolean };
	smtp: { host: string; port: number; tls?: boolean };
	auth: AuthEntry;
	identities?: Array<{ name?: string; address: string }>;
};

export type AccountsFile = {
	version: 1;
	default: string | null;
	accounts: AccountEntry[];
};

// ─── Path resolution ─────────────────────────────────────────────────────────

export function getConfigDir(): string {
	// EMAIL_CONFIG_DIR is a full-path override (useful for tests and CI).
	const override = process.env['EMAIL_CONFIG_DIR'];
	if (override) return override;
	const xdg = process.env['XDG_CONFIG_HOME'];
	return xdg ? join(xdg, 'email') : join(homedir(), '.config', 'email');
}

export function getDataDir(): string {
	// EMAIL_DATA_DIR is a full-path override (useful for tests and CI).
	const override = process.env['EMAIL_DATA_DIR'];
	if (override) return override;
	const xdg = process.env['XDG_DATA_HOME'];
	return xdg ? join(xdg, 'email') : join(homedir(), '.local', 'share', 'email');
}

export function accountsFilePath(): string {
	return join(getConfigDir(), 'accounts.json');
}

export function dbPathForAccount(slug: string): string {
	return join(getDataDir(), `${slug}.db`);
}

export function ensureConfigDir(): void {
	mkdirSync(getConfigDir(), { recursive: true });
}

export function ensureDataDir(): void {
	mkdirSync(getDataDir(), { recursive: true });
}

// ─── Load / save ─────────────────────────────────────────────────────────────

/** Returns null if the file does not exist yet (first run). Throws on malformed JSON. */
export function loadAccounts(): AccountsFile | null {
	let raw: string;
	try {
		raw = readFileSync(accountsFilePath(), 'utf-8');
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
		throw err;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new ConfigError('config_malformed', 'accounts.json contains invalid JSON.');
	}

	return validateAccounts(parsed);
}

export function saveAccounts(data: AccountsFile): void {
	ensureConfigDir();
	writeFileSync(accountsFilePath(), JSON.stringify(data, null, '\t') + '\n', 'utf-8');
}

// ─── Validation ──────────────────────────────────────────────────────────────

// Lightweight inline validation — no external schema validator dep.
export function validateAccounts(data: unknown): AccountsFile {
	if (typeof data !== 'object' || data === null || Array.isArray(data)) {
		throw new ConfigError('config_malformed', 'accounts.json must be a JSON object.');
	}

	const obj = data as Record<string, unknown>;

	if (obj['version'] !== 1) {
		throw new ConfigError(
			'config_version_unknown',
			`Unknown accounts.json version: ${String(obj['version'])}. Expected 1.`,
		);
	}

	if (!Array.isArray(obj['accounts'])) {
		throw new ConfigError('config_malformed', 'accounts.json: "accounts" must be an array.');
	}

	const names = new Set<string>();
	for (const raw of obj['accounts'] as unknown[]) {
		const entry = validateAccountEntry(raw);
		if (names.has(entry.name)) {
			throw new ConfigError('config_malformed', `Duplicate account name: "${entry.name}".`);
		}
		names.add(entry.name);
	}

	const accounts = (obj['accounts'] as unknown[]).map((a) => validateAccountEntry(a));
	const defaultVal = obj['default'] ?? null;

	if (defaultVal !== null && typeof defaultVal !== 'string') {
		throw new ConfigError('config_malformed', 'accounts.json: "default" must be a string or null.');
	}

	if (defaultVal !== null && !names.has(defaultVal as string)) {
		throw new ConfigError(
			'config_malformed',
			`accounts.json: default account "${String(defaultVal)}" does not exist.`,
		);
	}

	return { version: 1, default: defaultVal as string | null, accounts };
}

function validateAccountEntry(raw: unknown): AccountEntry {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		throw new ConfigError('account_invalid', 'Each account entry must be a JSON object.');
	}

	const obj = raw as Record<string, unknown>;

	const name = obj['name'];
	if (typeof name !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(name)) {
		throw new ConfigError(
			'account_invalid',
			`Account name "${String(name)}" is invalid. Use lowercase letters, digits, and hyphens only (e.g. "work", "gmail-personal").`,
		);
	}

	requireNestedString(obj, 'imap', 'host', name);
	requireNestedNumber(obj, 'imap', 'port', name);
	requireNestedString(obj, 'smtp', 'host', name);
	requireNestedNumber(obj, 'smtp', 'port', name);

	const imap = obj['imap'] as Record<string, unknown>;
	const smtp = obj['smtp'] as Record<string, unknown>;
	const auth = validateAuthEntry(obj['auth'], name);

	const result: AccountEntry = {
		name,
		imap: {
			host: imap['host'] as string,
			port: imap['port'] as number,
		},
		smtp: {
			host: smtp['host'] as string,
			port: smtp['port'] as number,
		},
		auth,
	};

	if (typeof obj['label'] === 'string') result.label = obj['label'];
	if (imap['tls'] !== undefined) result.imap.tls = Boolean(imap['tls']);
	if (smtp['tls'] !== undefined) result.smtp.tls = Boolean(smtp['tls']);

	if (Array.isArray(obj['identities'])) {
		result.identities = (obj['identities'] as unknown[]).map((id) => {
			if (typeof id !== 'object' || id === null) {
				throw new ConfigError('account_invalid', `Account "${name}": identities must be objects.`);
			}
			const idObj = id as Record<string, unknown>;
			if (typeof idObj['address'] !== 'string') {
				throw new ConfigError(
					'account_invalid',
					`Account "${name}": each identity must have an "address" string.`,
				);
			}
			const identity: { address: string; name?: string } = { address: idObj['address'] };
			if (typeof idObj['name'] === 'string') identity.name = idObj['name'];
			return identity;
		});
	}

	return result;
}

function validateAuthEntry(raw: unknown, accountName: string): AuthEntry {
	if (typeof raw !== 'object' || raw === null) {
		throw new ConfigError(
			'account_invalid',
			`Account "${accountName}": "auth" must be an object with a "type" field.`,
		);
	}

	const obj = raw as Record<string, unknown>;
	const type = obj['type'];

	if (type === 'password') {
		if (typeof obj['user'] !== 'string' || typeof obj['pass'] !== 'string') {
			throw new ConfigError(
				'account_invalid',
				`Account "${accountName}": password auth requires "user" and "pass" strings.`,
			);
		}
		return { type: 'password', user: obj['user'], pass: obj['pass'] };
	}

	if (type === 'oauth2') {
		if (typeof obj['user'] !== 'string' || typeof obj['accessToken'] !== 'string') {
			throw new ConfigError(
				'account_invalid',
				`Account "${accountName}": oauth2 auth requires "user" and "accessToken" strings.`,
			);
		}
		const auth: AuthEntry = { type: 'oauth2', user: obj['user'], accessToken: obj['accessToken'] };
		if (typeof obj['refreshToken'] === 'string') {
			(
				auth as { type: 'oauth2'; user: string; accessToken: string; refreshToken?: string }
			).refreshToken = obj['refreshToken'];
		}
		return auth;
	}

	if (type === 'sasl') {
		if (
			typeof obj['mechanism'] !== 'string' ||
			typeof obj['credentials'] !== 'object' ||
			obj['credentials'] === null
		) {
			throw new ConfigError(
				'account_invalid',
				`Account "${accountName}": sasl auth requires "mechanism" string and "credentials" object.`,
			);
		}
		return {
			type: 'sasl',
			mechanism: obj['mechanism'],
			credentials: obj['credentials'] as Record<string, string>,
		};
	}

	throw new ConfigError(
		'account_invalid',
		`Account "${accountName}": auth.type must be "password", "oauth2", or "sasl". Got: "${String(type)}".`,
	);
}

function requireNestedString(
	obj: Record<string, unknown>,
	section: string,
	field: string,
	accountName: string,
): void {
	const nested = obj[section];
	if (typeof nested !== 'object' || nested === null) {
		throw new ConfigError(
			'account_invalid',
			`Account "${accountName}": missing "${section}" object.`,
		);
	}
	const val = (nested as Record<string, unknown>)[field];
	if (typeof val !== 'string') {
		throw new ConfigError(
			'account_invalid',
			`Account "${accountName}": "${section}.${field}" must be a string.`,
		);
	}
}

function requireNestedNumber(
	obj: Record<string, unknown>,
	section: string,
	field: string,
	accountName: string,
): void {
	const nested = obj[section];
	if (typeof nested !== 'object' || nested === null) return; // already caught by string check
	const val = (nested as Record<string, unknown>)[field];
	if (typeof val !== 'number') {
		throw new ConfigError(
			'account_invalid',
			`Account "${accountName}": "${section}.${field}" must be a number.`,
		);
	}
}

// ─── Internal error used only within config.ts ────────────────────────────────

export type ConfigErrorCode = 'config_malformed' | 'config_version_unknown' | 'account_invalid';

export class ConfigError extends Error {
	readonly code: ConfigErrorCode;

	constructor(code: ConfigErrorCode, message: string) {
		super(message);
		this.name = 'ConfigError';
		this.code = code;
	}
}
