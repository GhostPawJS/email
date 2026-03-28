import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fetchBody } from './fetch_body.ts';

describe('fetchBody', () => {
	it('is exported as a function', () => {
		assert.equal(typeof fetchBody, 'function');
	});
});
