import assert from 'node:assert/strict';
import test from 'node:test';
import type { ImapSession } from '../imap/session.ts';
import { init } from '../runtime.ts';
import * as store from '../store/index.ts';
import type { FetchResult } from '../types/imap_response.ts';
import { syncFolder } from './sync_folder.ts';

for (const strategy of ['initial', 'qresync', 'fallback'] as const) {
	for (const populated of [false, true]) {
		test(`${strategy} sync handles ${populated ? 'populated' : 'absent'} envelopes`, async () => {
			const { db } = init({
				imap: { host: 'local', port: 143 },
				smtp: { host: 'local', port: 587 },
				auth: { user: 'u', pass: 'p' },
			});
			try {
				const account = store.upsertAccount(db, { host: 'local', port: 143, username: 'u' });
				const folder = store.upsertFolder(db, {
					accountId: account.id,
					path: 'INBOX',
					uidValidity: strategy === 'initial' ? null : 1,
				});
				const address = { address: 'a@b' };
				const result: FetchResult = {
					uid: 1,
					flags: [],
					internalDate: null,
					size: 12,
					modSeq: 1,
					bodySections: new Map(),
					bodyStructure: {
						type: 'multipart',
						subtype: 'mixed',
						params: {},
						id: null,
						description: null,
						encoding: '7bit',
						size: 0,
						partPath: '',
						children: [
							{
								type: 'text',
								subtype: 'plain',
								params: {},
								id: null,
								description: null,
								encoding: '7bit',
								size: 12,
								partPath: '1',
								disposition: { type: 'attachment', params: {} },
							},
						],
					},
					envelope: populated
						? {
								date: '2026-01-01',
								subject: 'Hello',
								from: [address],
								sender: [address],
								replyTo: [address],
								to: [address],
								cc: [address],
								bcc: [address],
								inReplyTo: '<parent>',
								messageId: '<id>',
							}
						: null,
				};
				const session = {
					extensions: { qresync: strategy === 'qresync' },
					async selectFolder() {
						return { exists: 1, uidValidity: 1, uidNext: 2, highestModSeq: 1 };
					},
					async searchMessages() {
						return [1];
					},
					async fetchMessages() {
						return [result];
					},
				} as unknown as ImapSession;
				const synced = await syncFolder(session, db, folder);
				assert.equal(synced.newMessages, 1);
				const message = store.getMessage(db, folder.id, 1);
				assert.equal(message?.subject, populated ? 'Hello' : null);
				assert.equal(message?.replyTo?.address ?? null, populated ? 'a@b' : null);
				const current = store.getFolderById(db, folder.id);
				assert.ok(current);
				const repeated = await syncFolder(session, db, current);
				assert.equal(repeated.newMessages, 0);
				assert.equal(repeated.updatedFlags, 0);
			} finally {
				db.close();
			}
		});
	}
}

test('fallback resets cached messages when UIDVALIDITY changes', async () => {
	const { db } = init({
		imap: { host: 'h', port: 143 },
		smtp: { host: 'h', port: 587 },
		auth: { user: 'u', pass: 'p' },
	});
	try {
		const account = store.upsertAccount(db, { host: 'h', port: 143, username: 'u' });
		const folder = store.upsertFolder(db, { accountId: account.id, path: 'INBOX', uidValidity: 1 });
		const session = {
			extensions: { qresync: false },
			async selectFolder() {
				return { exists: 0, uidValidity: 2, uidNext: 1, highestModSeq: null };
			},
		} as unknown as ImapSession;
		assert.equal((await syncFolder(session, db, folder)).newMessages, 0);
		assert.equal(store.getFolderById(db, folder.id)?.uidValidity, 2);
	} finally {
		db.close();
	}
});
