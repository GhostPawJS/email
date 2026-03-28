import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createTagGenerator } from './tag_generator.ts';

describe('createTagGenerator', () => {
	it('generates sequential tags', () => {
		const next = createTagGenerator('A');
		assert.equal(next(), 'A0001');
		assert.equal(next(), 'A0002');
		assert.equal(next(), 'A0003');
	});

	it('uses default prefix', () => {
		const next = createTagGenerator();
		assert.ok(next().startsWith('A'));
	});
});
