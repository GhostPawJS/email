import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fetchAttachment } from './fetch_attachment.ts';

describe('fetchAttachment', () => {
	it('is exported as a function', () => {
		assert.equal(typeof fetchAttachment, 'function');
	});
});
