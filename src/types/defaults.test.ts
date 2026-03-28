import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	DEFAULT_BATCH_SIZE,
	DEFAULT_CONNECTION_TIMEOUT,
	DEFAULT_IDLE_TIMEOUT,
	DEFAULT_MAX_MESSAGE_SIZE,
	DEFAULT_MAX_NESTING_DEPTH,
} from './defaults.ts';

describe('defaults', () => {
	it('matches CONCEPT.md knobs', () => {
		assert.equal(DEFAULT_CONNECTION_TIMEOUT, 30_000);
		assert.equal(DEFAULT_BATCH_SIZE, 500);
		assert.equal(DEFAULT_IDLE_TIMEOUT, 1_500_000);
		assert.equal(DEFAULT_MAX_NESTING_DEPTH, 50);
		assert.equal(DEFAULT_MAX_MESSAGE_SIZE, 26_214_400);
	});
});
