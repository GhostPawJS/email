import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EmailUnsupportedError } from '../errors.ts';
import { compileSearchQuery } from './search_compiler.ts';

describe('compileSearchQuery', () => {
	it('compiles unseen', () => {
		assert.equal(compileSearchQuery({ unseen: true }), 'UNSEEN');
	});

	it('compiles from', () => {
		assert.equal(compileSearchQuery({ from: 'alice@example.com' }), 'FROM "alice@example.com"');
	});

	it('compiles since date', () => {
		const since = new Date('2026-03-01T00:00:00Z');
		assert.equal(compileSearchQuery({ since }), 'SINCE 01-Mar-2026');
	});

	it('compiles nested or', () => {
		const r = compileSearchQuery({ or: [{ from: 'a' }, { from: 'b' }] });
		assert.ok(r.startsWith('OR'));
		assert.ok(r.includes('"a"'));
		assert.ok(r.includes('"b"'));
	});

	it('compiles not', () => {
		assert.equal(compileSearchQuery({ not: { deleted: true } }), 'NOT DELETED');
	});

	it('throws for gmailRaw without capability', () => {
		assert.throws(() => compileSearchQuery({ gmailRaw: 'label:important' }), EmailUnsupportedError);
	});

	it('compiles gmailRaw with capability', () => {
		const caps = new Set(['X-GM-EXT-1']);
		const r = compileSearchQuery({ gmailRaw: 'label:important' }, caps);
		assert.ok(r.includes('X-GM-RAW'));
	});

	it('falls back to ALL when empty query', () => {
		assert.equal(compileSearchQuery({}), 'ALL');
	});
});
