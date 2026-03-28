import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decodeAddress, decodeAddressList } from './decode_address.ts';

describe('decodeAddress', () => {
	it('parses simple address', () => {
		const r = decodeAddress('alice@example.com');
		assert.equal(r?.address, 'alice@example.com');
	});

	it('parses address with display name', () => {
		const r = decodeAddress('Alice Smith <alice@example.com>');
		assert.equal(r?.address, 'alice@example.com');
		assert.equal(r?.name, 'Alice Smith');
	});

	it('returns null for empty string', () => {
		assert.equal(decodeAddress(''), null);
	});
});

describe('decodeAddressList', () => {
	it('parses comma-separated addresses', () => {
		const list = decodeAddressList('alice@a.com, bob@b.com');
		assert.equal(list.length, 2);
		assert.equal(list[0]?.address, 'alice@a.com');
		assert.equal(list[1]?.address, 'bob@b.com');
	});

	it('returns empty array for empty string', () => {
		assert.deepEqual(decodeAddressList(''), []);
	});
});
