import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Address } from './address.ts';

describe('Address', () => {
	it('constructs with name and address', () => {
		const a: Address = { name: 'Alice', address: 'alice@example.com' };
		assert.equal(a.name, 'Alice');
		assert.equal(a.address, 'alice@example.com');
	});

	it('constructs with address only', () => {
		const a: Address = { address: 'bob@example.com' };
		assert.equal(a.address, 'bob@example.com');
		assert.equal(a.name, undefined);
	});
});
