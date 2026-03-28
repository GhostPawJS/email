import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	EmailAuthError,
	EmailConnectionError,
	EmailEnvelopeRejectedError,
	EmailError,
	EmailProtocolError,
	EmailQuotaError,
	EmailTimeoutError,
	EmailUnsupportedError,
	EmailValidationError,
	isEmailError,
	isRetriable,
} from './errors.ts';

describe('errors', () => {
	it('instanceof and code for subclasses', () => {
		const e = new EmailAuthError('bad', 'PLAIN');
		assert.ok(e instanceof EmailError);
		assert.equal(e.code, 'auth');
		assert.equal(e.mechanism, 'PLAIN');
	});

	it('isEmailError type guard', () => {
		assert.equal(isEmailError(new EmailValidationError('x')), true);
		assert.equal(isEmailError(new Error('x')), false);
	});

	it('isRetriable for connection and timeout', () => {
		assert.equal(isRetriable(new EmailConnectionError('x')), true);
		assert.equal(isRetriable(new EmailTimeoutError('x')), true);
	});

	it('isRetriable for SMTP 4xx on protocol error', () => {
		assert.equal(isRetriable(new EmailProtocolError('temp', { smtpCode: 450 })), true);
		assert.equal(isRetriable(new EmailProtocolError('perm', { smtpCode: 550 })), false);
	});

	it('isRetriable false for auth', () => {
		assert.equal(isRetriable(new EmailAuthError('x')), false);
	});

	it('quota and envelope errors', () => {
		const q = new EmailQuotaError('full', 1, 2);
		assert.equal(q.code, 'quota');
		const env = new EmailEnvelopeRejectedError('no', 550);
		assert.equal(env.code, 'envelope_rejected');
		const u = new EmailUnsupportedError('gmailRaw');
		assert.equal(u.feature, 'gmailRaw');
	});
});
