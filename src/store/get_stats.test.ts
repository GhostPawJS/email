import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { getStats } from './get_stats.ts';
import { upsertAccount } from './upsert_account.ts';

describe('getStats', () => {
	it('returns aggregates', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		const a = upsertAccount(db, { host: 'h', port: 993, username: 'u' });
		const s = getStats(db, a.id);
		assert.equal(typeof s.totalMessages, 'number');
		assert.equal(typeof s.storageUsed, 'number');
		db.close();
	});
});
