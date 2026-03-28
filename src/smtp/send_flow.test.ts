import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { smtpSend } from './send_flow.ts';

describe('smtpSend', () => {
	it('is exported as a function', () => {
		assert.equal(typeof smtpSend, 'function');
	});
});
