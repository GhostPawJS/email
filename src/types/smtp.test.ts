import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SmtpResponse } from './smtp.ts';

describe('SmtpResponse', () => {
	it('constructs SmtpResponse', () => {
		const r: SmtpResponse = {
			code: 250,
			enhanced: '2.1.0',
			message: 'OK',
			isMultiline: false,
		};
		assert.equal(r.code, 250);
	});
});
