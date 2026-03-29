import { defineCommand } from 'citty';
import {
	type AccountEntry,
	type AccountsFile,
	type AuthEntry,
	ensureConfigDir,
	loadAccounts,
	saveAccounts,
} from '../config.ts';
import { CliError, safeRun } from '../errors.ts';
import { bold, dim, print, printError } from '../output.ts';

export const accountCommand = defineCommand({
	meta: {
		name: 'account',
		description: 'Manage email accounts stored in ~/.config/email/accounts.json.',
	},
	subCommands: {
		list: defineCommand({
			meta: { name: 'list', description: 'List all configured accounts.' },
			async run() {
				await safeRun({}, async () => {
					const file = loadAccounts();
					if (!file || file.accounts.length === 0) {
						print('No accounts configured. Run `email account add` to get started.');
						return;
					}
					print('');
					for (const account of file.accounts) {
						const marker = account.name === file.default ? bold(' (default)') : '';
						const label = account.label ? ` — ${account.label}` : '';
						print(`  ${bold(account.name)}${marker}${dim(label)}`);
						print(dim(`    imap  ${account.imap.host}:${account.imap.port}`));
						print(dim(`    smtp  ${account.smtp.host}:${account.smtp.port}`));
						print(dim(`    user  ${authUser(account.auth)}`));
						print('');
					}
				}); // end safeRun
			},
		}),

		add: defineCommand({
			meta: { name: 'add', description: 'Add a new account.' },
			args: {
				name: {
					type: 'string',
					description: 'Account slug (e.g. "work", "gmail")',
					required: true,
				},
				label: { type: 'string', description: 'Human-readable label (optional)' },
				'imap-host': { type: 'string', description: 'IMAP hostname', required: true },
				'imap-port': { type: 'string', description: 'IMAP port (default: 993)', default: '993' },
				'imap-tls': {
					type: 'boolean',
					description: 'Use TLS for IMAP (default: true)',
					default: true,
				},
				'smtp-host': { type: 'string', description: 'SMTP hostname', required: true },
				'smtp-port': { type: 'string', description: 'SMTP port (default: 587)', default: '587' },
				'smtp-tls': {
					type: 'boolean',
					description: 'Use TLS for SMTP (default: true)',
					default: true,
				},
				user: { type: 'string', description: 'Auth username / email address', required: true },
				pass: { type: 'string', description: 'App password (for password auth)' },
				'access-token': {
					type: 'string',
					description: 'OAuth2 access token (alternative to --pass)',
				},
				'refresh-token': { type: 'string', description: 'OAuth2 refresh token (optional)' },
			},
			async run({ args: _args }) {
				type Args = {
					name: string;
					label?: string;
					'imap-host': string;
					'imap-port': string;
					'imap-tls': boolean;
					'smtp-host': string;
					'smtp-port': string;
					'smtp-tls': boolean;
					user: string;
					pass?: string;
					'access-token'?: string;
					'refresh-token'?: string;
				};
				const args = _args as unknown as Args;
				await safeRun(_args as Record<string, unknown>, async () => {
					if (!args.pass && !args['access-token']) {
						throw new CliError(
							'missing_required_flag',
							'Provide either --pass <password> or --access-token <token>.',
						);
					}

					const name = args.name;
					if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
						throw new CliError(
							'invalid_flag_value',
							`Invalid account name "${name}". Use lowercase letters, digits, and hyphens only (e.g. "work", "gmail-personal").`,
						);
					}

					let auth: AuthEntry;
					if (args['access-token']) {
						auth = args['refresh-token']
							? {
									type: 'oauth2',
									user: args.user,
									accessToken: args['access-token'],
									refreshToken: args['refresh-token'],
								}
							: { type: 'oauth2', user: args.user, accessToken: args['access-token'] };
					} else {
						auth = { type: 'password', user: args.user, pass: args.pass! };
					}

					const entry: AccountEntry = {
						name,
						imap: {
							host: args['imap-host'],
							port: parseInt(args['imap-port'] ?? '993', 10),
							tls: args['imap-tls'],
						},
						smtp: {
							host: args['smtp-host'],
							port: parseInt(args['smtp-port'] ?? '587', 10),
							tls: args['smtp-tls'],
						},
						auth,
					};
					if (args.label) entry.label = args.label;

					const existing = loadAccounts();
					if (existing?.accounts.some((a) => a.name === name)) {
						throw new CliError(
							'account_invalid',
							`Account "${name}" already exists. Use \`email account remove --name ${name}\` first.`,
						);
					}

					const file: AccountsFile = existing ?? { version: 1, default: null, accounts: [] };
					file.accounts.push(entry);
					if (!file.default) file.default = name;

					ensureConfigDir();
					saveAccounts(file);

					print(`✔ Account "${name}" saved.`);
					if (file.default === name && !existing?.default) {
						print(`  Set as default.`);
					}
				}); // end safeRun
			},
		}),

		remove: defineCommand({
			meta: { name: 'remove', description: 'Remove an account.' },
			args: {
				name: { type: 'string', description: 'Account slug to remove', required: true },
			},
			async run({ args: _args }) {
				type Args = { name: string };
				const args = _args as unknown as Args;
				await safeRun(_args as Record<string, unknown>, async () => {
					const file = loadAccounts();
					if (!file) throw new CliError('no_config', 'No accounts configured yet.');

					const idx = file.accounts.findIndex((a) => a.name === args.name);
					if (idx === -1) {
						throw new CliError('account_not_found', `Account "${args.name}" not found.`);
					}

					file.accounts.splice(idx, 1);
					if (file.default === args.name) {
						file.default = file.accounts[0]?.name ?? null;
					}

					saveAccounts(file);
					print(`✔ Account "${args.name}" removed.`);
					if (file.default) print(`  Default is now "${file.default}".`);
				}); // end safeRun
			},
		}),

		'set-default': defineCommand({
			meta: { name: 'set-default', description: 'Set the default account.' },
			args: {
				name: { type: 'string', description: 'Account slug to set as default', required: true },
			},
			async run({ args: _args }) {
				type Args = { name: string };
				const args = _args as unknown as Args;
				await safeRun(_args as Record<string, unknown>, async () => {
					const file = loadAccounts();
					if (!file) throw new CliError('no_config', 'No accounts configured yet.');

					if (!file.accounts.some((a) => a.name === args.name)) {
						throw new CliError('account_not_found', `Account "${args.name}" not found.`);
					}

					file.default = args.name;
					saveAccounts(file);
					print(`✔ Default account set to "${args.name}".`);
				}); // end safeRun
			},
		}),

		show: defineCommand({
			meta: { name: 'show', description: 'Show account config (password redacted).' },
			args: {
				name: { type: 'string', description: 'Account slug (defaults to default account)' },
			},
			async run({ args: _args }) {
				type Args = { name?: string };
				const args = _args as unknown as Args;
				await safeRun(_args as Record<string, unknown>, async () => {
					const file = loadAccounts();
					if (!file) throw new CliError('no_config', 'No accounts configured yet.');

					const slug = args.name ?? file.default;
					if (!slug)
						throw new CliError('no_default_account', 'No default account. Use --name <slug>.');

					const account = file.accounts.find((a) => a.name === slug);
					if (!account) throw new CliError('account_not_found', `Account "${slug}" not found.`);

					const redacted = redactAuth(account.auth);
					print(JSON.stringify({ ...account, auth: redacted }, null, 2));
				}); // end safeRun
			},
		}),
	},
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authUser(auth: AuthEntry): string {
	if (auth.type === 'sasl') return auth.credentials['user'] ?? auth.mechanism;
	return auth.user;
}

function redactAuth(auth: AuthEntry): Record<string, unknown> {
	if (auth.type === 'password') return { type: 'password', user: auth.user, pass: '[redacted]' };
	if (auth.type === 'oauth2') {
		const r: Record<string, unknown> = {
			type: 'oauth2',
			user: auth.user,
			accessToken: '[redacted]',
		};
		if (auth.refreshToken) r['refreshToken'] = '[redacted]';
		return r;
	}
	return { type: 'sasl', mechanism: auth.mechanism, credentials: '[redacted]' };
}

// Suppress unused import warning — printError is imported for use in parent error handler.
void printError;
