import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MessageListOptions, SearchQuery } from './search.ts';

describe('SearchQuery', () => {
	it('supports nested or and not', () => {
		const q: SearchQuery = {
			or: [{ from: 'a@b.com' }, { from: 'c@d.com' }],
			not: { deleted: true },
		};
		assert.equal(q.or?.[0]?.from, 'a@b.com');
		assert.equal(q.not?.deleted, true);
	});

	it('constructs list options', () => {
		const o: MessageListOptions = { limit: 10, sort: 'date', order: 'desc' };
		assert.equal(o.limit, 10);
	});
});
