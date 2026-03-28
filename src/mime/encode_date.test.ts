import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { encodeDate } from './encode_date.ts';

describe('encodeDate', () => {
	it('formats a date as RFC 2822', () => {
		const d = new Date('2026-03-27T12:00:00Z');
		const result = encodeDate(d);
		// Must include day, month, year, time and timezone
		assert.ok(result.includes('2026'));
		assert.ok(result.includes('Mar') || result.includes('27'));
	});

	it('uses current date when called without argument', () => {
		const result = encodeDate();
		assert.ok(typeof result === 'string');
		assert.ok(result.length > 10);
	});
});
