import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { accountsFilePath, saveAccounts } from './cli/config.ts';
import { init } from './runtime.ts';
import { openEmailDb } from './surface/open_email_db.ts';

const mode = (path: string) => statSync(path).mode & 0o777;
test(
	'new databases and sidecars are private and existing modes stay unchanged',
	{ skip: process.platform === 'win32' },
	async () => {
		const root = mkdtempSync(join(tmpdir(), 'email-private-'));
		const previous = process.umask(0);
		try {
			for (const existing of [false, true]) {
				for (const entry of ['runtime', 'surface']) {
					const path = join(root, `${entry}-${existing}`, 'nested', 'mail.db');
					if (existing) {
						const { mkdirSync } = await import('node:fs');
						mkdirSync(dirname(path), { recursive: true, mode: 0o755 });
						writeFileSync(path, '', { mode: 0o644 });
					}
					const before = process.umask();
					const db =
						entry === 'surface'
							? await openEmailDb(path)
							: init({
									imap: { host: 'localhost', port: 993 },
									smtp: { host: 'localhost', port: 587 },
									auth: { user: 'u', pass: 'p' },
									storage: path,
								}).db;
					try {
						assert.equal(process.umask(), before);
						assert.equal(mode(path), existing ? 0o644 : 0o600);
						assert.equal(mode(dirname(path)), existing ? 0o755 : 0o700);
						assert.equal(mode(`${path}-wal`), 0o600);
						assert.equal(mode(`${path}-shm`), 0o600);
					} finally {
						db.close();
					}
				}
			}
		} finally {
			process.umask(previous);
			rmSync(root, { recursive: true, force: true });
		}
	},
);
test(
	'accounts are private on creation and rewrite without chmod of existing directories',
	{ skip: process.platform === 'win32' },
	() => {
		const root = mkdtempSync(join(tmpdir(), 'email-config-private-'));
		const oldDir = process.env.EMAIL_CONFIG_DIR;
		const previous = process.umask(0);
		process.env.EMAIL_CONFIG_DIR = join(root, 'config', 'nested');
		try {
			const data = { version: 1 as const, default: null, accounts: [] };
			saveAccounts(data);
			assert.equal(mode(accountsFilePath()), 0o600);
			assert.equal(mode(dirname(accountsFilePath())), 0o700);
			chmodSync(accountsFilePath(), 0o644);
			chmodSync(dirname(accountsFilePath()), 0o755);
			saveAccounts(data);
			assert.equal(mode(accountsFilePath()), 0o600);
			assert.equal(mode(dirname(accountsFilePath())), 0o755);
		} finally {
			if (oldDir === undefined) delete process.env.EMAIL_CONFIG_DIR;
			else process.env.EMAIL_CONFIG_DIR = oldDir;
			process.umask(previous);
			rmSync(root, { recursive: true, force: true });
		}
	},
);

test(
	'opening an existing cache preserves existing sidecar modes',
	{ skip: process.platform === 'win32' },
	async () => {
		const root = mkdtempSync(join(tmpdir(), 'email-sidecars-'));
		const path = join(root, 'mail.db');
		const db = await openEmailDb(path);
		try {
			chmodSync(path, 0o640);
			chmodSync(`${path}-wal`, 0o640);
			chmodSync(`${path}-shm`, 0o640);
			const second = await openEmailDb(path);
			try {
				for (const file of [path, `${path}-wal`, `${path}-shm`]) assert.equal(mode(file), 0o640);
			} finally {
				second.close();
			}
		} finally {
			db.close();
			rmSync(root, { recursive: true, force: true });
		}
	},
);
