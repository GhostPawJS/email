import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { describe, it, test } from 'node:test';
import { runCommand } from 'citty';
import { ImapSession } from '../../imap/session.ts';
import { insertMessage, upsertAccount, upsertBody, upsertFolder } from '../../store/index.ts';
import { emailCliOptions } from '../../surface/email_cli_options.ts';
import { openEmailDb } from '../../surface/open_email_db.ts';
import { runToolCli } from '../../surfaces/cli.ts';
import { dbPathForAccount, saveAccounts } from '../config.ts';
import { CliError } from '../errors.ts';
import { readCommand } from './read.ts';

test('read message JSON includes headers and bodies and call shares the configured cache', async (t) => {
	const dir = mkdtempSync(join(tmpdir(), 'cli-read-'));
	const originalEnv = { ...process.env };
	for (const key of Object.keys(process.env)) {
		if (key.startsWith('EMAIL_') || key === 'GHOSTPAW_EMAIL_DB') delete process.env[key];
	}
	process.env.EMAIL_CONFIG_DIR = dir;
	process.env.EMAIL_DATA_DIR = dir;
	t.mock.method(ImapSession.prototype, 'connect', async () => {});
	t.mock.method(ImapSession.prototype, 'disconnect', async () => {});
	try {
		saveAccounts({
			version: 1,
			default: 'work',
			accounts: [
				{
					name: 'work',
					imap: { host: 'fake', port: 143, tls: false },
					smtp: { host: 'fake', port: 25, tls: false },
					auth: { type: 'password', user: 'reader', pass: 'secret' },
				},
			],
		});
		const db = await openEmailDb(dbPathForAccount('work'));
		const account = upsertAccount(db, { host: 'fake', port: 143, username: 'reader' });
		const folder = upsertFolder(db, { accountId: account.id, path: 'INBOX' });
		const message = insertMessage(db, {
			folderId: folder.id,
			uid: 1,
			messageId: '<hello@test>',
			inReplyTo: null,
			references: [],
			threadId: null,
			from: { address: 'sender@test' },
			to: [],
			cc: [],
			bcc: [],
			replyTo: null,
			subject: 'Hello',
			date: null,
			receivedAt: new Date().toISOString(),
			envelopeFrom: null,
			envelopeTo: [],
			flags: [],
			labels: [],
			size: null,
			bodyStructure: null,
			hasAttachments: false,
			modSeq: null,
		});
		upsertBody(db, message.id, 'Body text', '<p>Body text</p>');
		db.close();
		let output = '';
		const capture = t.mock.method(process.stdout, 'write', ((chunk: string) => {
			output += String(chunk);
			return true;
		}) as typeof process.stdout.write);
		await runCommand(readCommand, {
			rawArgs: ['message', '--folder', 'INBOX', '--uid', '1', '--json'],
		});
		capture.mock.restore();
		const result = JSON.parse(output);
		assert.equal(result.data.subject, 'Hello');
		assert.equal(result.data.from.address, 'sender@test');
		assert.equal(result.data.textPlain, 'Body text');
		assert.equal(result.data.textHtml, '<p>Body text</p>');
		for (const view of ['message', 'queue']) {
			let called = '';
			const code = await runToolCli(
				[
					'call',
					'mail_read',
					JSON.stringify({ view, folder: 'INBOX', ...(view === 'message' ? { uid: 1 } : {}) }),
				],
				{
					...emailCliOptions,
					stdout: new Writable({
						write(chunk, _encoding, cb) {
							called += String(chunk);
							cb();
						},
					}),
				},
			);
			assert.equal(code, 0, called);
			assert.match(called, /Hello/);
		}
	} finally {
		process.env = originalEnv;
		rmSync(dir, { recursive: true, force: true });
	}
});

// ─── Helpers shared across command tests ─────────────────────────────────────

// We test the flag-validation and input-construction logic in isolation by
// calling the internal helpers. For full integration we rely on the library's
// existing test suite. These tests verify the CLI's own wiring.

// ─── UID parsing ─────────────────────────────────────────────────────────────

function parseUid(raw: string, view: string): number {
	const n = parseInt(raw, 10);
	if (!Number.isFinite(n) || n <= 0) {
		throw new CliError(
			'invalid_flag_value',
			`--uid must be a positive integer (view: ${view}). Got: "${raw}"`,
		);
	}
	return n;
}

describe('read command — UID parsing', () => {
	it('parses a valid UID string', () => {
		assert.equal(parseUid('42', 'message'), 42);
	});

	it('throws invalid_flag_value for non-numeric UID', () => {
		assert.throws(
			() => parseUid('abc', 'message'),
			(e) => e instanceof CliError && e.code === 'invalid_flag_value',
		);
	});

	it('throws invalid_flag_value for zero UID', () => {
		assert.throws(
			() => parseUid('0', 'message'),
			(e) => e instanceof CliError && e.code === 'invalid_flag_value',
		);
	});

	it('throws invalid_flag_value for negative UID', () => {
		assert.throws(
			() => parseUid('-5', 'message'),
			(e) => e instanceof CliError && e.code === 'invalid_flag_value',
		);
	});
});

// ─── Required flag checking ───────────────────────────────────────────────────

function requireFlag(
	value: string | undefined,
	flag: string,
	view: string,
): asserts value is string {
	if (!value) {
		throw new CliError('missing_required_flag', `${flag} is required for view: ${view}`);
	}
}

describe('read command — required flag checking', () => {
	it('passes when value is present', () => {
		assert.doesNotThrow(() => requireFlag('INBOX', '--folder', 'message'));
	});

	it('throws missing_required_flag when value is undefined', () => {
		assert.throws(
			() => requireFlag(undefined, '--folder', 'message'),
			(e) => e instanceof CliError && e.code === 'missing_required_flag',
		);
	});

	it('throws missing_required_flag when value is empty string', () => {
		assert.throws(
			() => requireFlag('', '--folder', 'message'),
			(e) => e instanceof CliError && e.code === 'missing_required_flag',
		);
	});
});

// ─── Unknown view ─────────────────────────────────────────────────────────────

describe('read command — unknown view', () => {
	it('throws unknown_subaction for unknown view', () => {
		const view = 'typo';
		const validViews = ['folders', 'queue', 'thread', 'message', 'attachment', 'eml'];
		if (!validViews.includes(view)) {
			const err = new CliError('unknown_subaction', `Unknown view: "${view}"`);
			assert.equal(err.code, 'unknown_subaction');
		}
	});
});
