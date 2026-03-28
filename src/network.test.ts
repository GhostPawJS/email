import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import type { EmailDb } from './database.ts';
import { EmailUnsupportedError } from './errors.ts';
import type { ImapSession } from './imap/session.ts';
import { createNetworkSurface } from './network.ts';
import { initSchema } from './schema/index.ts';
import { upsertAccount } from './store/upsert_account.ts';

describe('createNetworkSurface', () => {
	it('throws EmailUnsupportedError for all methods when no session is provided', async () => {
		const db = new DatabaseSync(':memory:') as EmailDb;
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const net = createNetworkSurface(db, { accountId: a.id });

		await assert.rejects(() => net.connect(), EmailUnsupportedError);
		await assert.rejects(() => net.disconnect(), EmailUnsupportedError);
		await assert.rejects(() => net.reconnect(), EmailUnsupportedError);
		await assert.rejects(() => net.sync(), EmailUnsupportedError);
		await assert.rejects(() => net.refreshFolders(), EmailUnsupportedError);
		await assert.rejects(() => net.searchRemote('INBOX', {}), EmailUnsupportedError);
		await assert.rejects(() => net.fetchBody('INBOX', 1), EmailUnsupportedError);
		await assert.rejects(() => net.fetchAttachment('INBOX', 1, '1'), EmailUnsupportedError);
		db.close();
	});

	it('watch yields nothing and exits cleanly without session (aborted immediately)', async () => {
		const db = new DatabaseSync(':memory:') as EmailDb;
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const net = createNetworkSurface(db, { accountId: a.id });
		const events: unknown[] = [];
		try {
			for await (const ev of net.watch({ folders: ['INBOX'] })) {
				events.push(ev);
			}
		} catch {
			// expected to throw EmailUnsupportedError from selectFolder
		}
		assert.ok(events.length === 0);
		db.close();
	});

	it('reconnect succeeds when connect works on the first attempt', async () => {
		const db = new DatabaseSync(':memory:') as EmailDb;
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });

		let connectCalls = 0;
		const mockSession = {
			disconnect: async () => {},
			connect: async () => {
				connectCalls++;
			},
			selectedFolder: null,
			capabilities: new Set<string>(),
			extensions: {},
		} as unknown as ImapSession;

		const net = createNetworkSurface(db, { accountId: a.id, session: mockSession });
		await assert.doesNotReject(() => net.reconnect());
		assert.equal(connectCalls, 1, 'connect should be called exactly once on immediate success');
		db.close();
	});

	it('reconnect retries on transient failure and eventually succeeds', async () => {
		const db = new DatabaseSync(':memory:') as EmailDb;
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });

		let attempts = 0;
		const mockSession = {
			disconnect: async () => {},
			connect: async () => {
				attempts++;
				if (attempts < 3) throw new Error('transient error');
			},
			selectedFolder: null,
			capabilities: new Set<string>(),
			extensions: {},
		} as unknown as ImapSession;

		// Patch setTimeout to be instant so the backoff delays don't slow the test.
		const origSetTimeout = globalThis.setTimeout;
		// biome-ignore lint/suspicious/noExplicitAny: intentional timer mock
		(globalThis as any).setTimeout = (fn: () => void, _delay: number) => origSetTimeout(fn, 0);

		try {
			const net = createNetworkSurface(db, { accountId: a.id, session: mockSession });
			await assert.doesNotReject(() => net.reconnect());
			assert.equal(attempts, 3, 'should have retried until success on 3rd attempt');
		} finally {
			// biome-ignore lint/suspicious/noExplicitAny: restoring original
			(globalThis as any).setTimeout = origSetTimeout;
			db.close();
		}
	});

	it('reconnect throws last error after exhausting all retry attempts', async () => {
		const db = new DatabaseSync(':memory:') as EmailDb;
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });

		const mockSession = {
			disconnect: async () => {},
			connect: async () => {
				throw new Error('server permanently down');
			},
			selectedFolder: null,
			capabilities: new Set<string>(),
			extensions: {},
		} as unknown as ImapSession;

		// Patch setTimeout to skip delays entirely.
		const origSetTimeout = globalThis.setTimeout;
		// biome-ignore lint/suspicious/noExplicitAny: intentional timer mock
		(globalThis as any).setTimeout = (fn: () => void, _delay: number) => origSetTimeout(fn, 0);

		try {
			const net = createNetworkSurface(db, { accountId: a.id, session: mockSession });
			await assert.rejects(() => net.reconnect(), /server permanently down/);
		} finally {
			// biome-ignore lint/suspicious/noExplicitAny: restoring original
			(globalThis as any).setTimeout = origSetTimeout;
			db.close();
		}
	});
});
