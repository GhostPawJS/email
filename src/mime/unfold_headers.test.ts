import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { unfoldHeaders } from './unfold_headers.ts';

describe('unfoldHeaders', () => {
	it('joins folded header lines', () => {
		const folded = 'Subject: Hello\r\n World';
		const result = unfoldHeaders(folded);
		assert.ok(result.includes('Subject: Hello World'));
		assert.ok(!result.includes('\r\n '));
	});

	it('leaves unfolded headers unchanged', () => {
		const flat = 'Subject: Hello\r\nFrom: a@b.com';
		const result = unfoldHeaders(flat);
		assert.ok(result.includes('Subject: Hello'));
		assert.ok(result.includes('From: a@b.com'));
	});
});
