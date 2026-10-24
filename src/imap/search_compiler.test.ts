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

it('compiles all supported search criteria and nested expressions', () => {
	const date = new Date('2026-01-02T00:00:00Z');
	const query = compileSearchQuery(
		{
			all: true,
			unseen: true,
			seen: true,
			flagged: true,
			answered: true,
			deleted: true,
			draft: true,
			since: date,
			before: date,
			on: date,
			from: 'a',
			to: 'b',
			cc: 'c',
			subject: 's',
			body: 'b',
			text: 't',
			header: { name: 'X-Test', value: 'v' },
			larger: 10,
			smaller: 100,
			uid: '1:2',
			modseq: 3,
			gmailRaw: 'in:inbox',
			or: [{ seen: true }, { unseen: true }],
			not: { deleted: true },
		},
		new Set(['X-GM-EXT-1']),
	);
	for (const expected of [
		'ALL UNSEEN SEEN FLAGGED ANSWERED DELETED DRAFT',
		'SINCE 02-Jan-2026',
		'BEFORE 02-Jan-2026',
		'ON 02-Jan-2026',
		'FROM "a"',
		'TO "b"',
		'CC "c"',
		'HEADER "X-Test" "v"',
		'LARGER 10 SMALLER 100 UID 1:2 MODSEQ 3',
		'X-GM-RAW "in:inbox"',
		'OR SEEN UNSEEN NOT DELETED',
	])
		assert.ok(query.includes(expected), expected);
	assert.equal(compileSearchQuery({}), 'ALL');
});
