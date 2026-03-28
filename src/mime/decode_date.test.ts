import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decodeDate } from './decode_date.ts';

describe('decodeDate', () => {
	it('parses RFC 2822 date to ISO 8601 string', () => {
		const result = decodeDate('Thu, 27 Mar 2026 12:00:00 +0000');
		assert.ok(typeof result === 'string');
		assert.ok(result.startsWith('2026-03-27'));
	});

	it('returns a date string for invalid input (falls back to current time)', () => {
		const result = decodeDate('not a date');
		assert.ok(typeof result === 'string');
		assert.ok(result.length > 10);
	});

	it('handles UTC timezone', () => {
		const result = decodeDate('1 Jan 2026 00:00:00 UTC');
		assert.ok(result.includes('2026-01-01'));
	});
});
