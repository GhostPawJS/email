import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { initSchema } from '../schema/init_schema.ts';
import { getBody } from './get_body.ts';

describe('getBody', () => {
	it('returns undefined when missing', () => {
		const db = new DatabaseSync(':memory:');
		initSchema(db);
		assert.equal(getBody(db, 999), undefined);
		db.close();
	});
});
