import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { encodeAddress, encodeAddressList } from './encode_address.ts';

describe('encodeAddress', () => {
	it('encodes address without name', () => {
		assert.equal(encodeAddress({ address: 'alice@example.com' }), 'alice@example.com');
	});

	it('encodes address with plain name', () => {
		const r = encodeAddress({ address: 'alice@example.com', name: 'Alice' });
		assert.equal(r, 'Alice <alice@example.com>');
	});
});

describe('encodeAddressList', () => {
	it('joins multiple addresses with comma', () => {
		const r = encodeAddressList([{ address: 'a@a.com' }, { address: 'b@b.com', name: 'Bob' }]);
		assert.ok(r.includes('a@a.com'));
		assert.ok(r.includes('Bob <b@b.com>'));
		assert.ok(r.includes(','));
	});

	it('returns empty string for empty list', () => {
		assert.equal(encodeAddressList([]), '');
	});
});
