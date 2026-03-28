import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateBoundary, generateMessageId, generateTag } from './generate_id.ts';

describe('generate_id', () => {
	it('formats message-id and tag', () => {
		assert.ok(generateMessageId('example.com').includes('@example.com'));
		assert.ok(generateBoundary().startsWith('----=_Part_'));
		assert.equal(generateTag('A', 1), 'A0001');
	});
});
