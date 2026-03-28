import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { categorizeSmtpError, parseSmtpResponse } from './parse_response.ts';

describe('parseSmtpResponse', () => {
	it('parses single-line 250', () => {
		const r = parseSmtpResponse(['250 OK']);
		assert.equal(r.code, 250);
		assert.equal(r.isMultiline, false);
		assert.ok(r.message.includes('OK'));
	});

	it('parses multi-line 250', () => {
		const r = parseSmtpResponse(['250-smtp.example.com', '250-STARTTLS', '250 OK']);
		assert.equal(r.code, 250);
		assert.equal(r.isMultiline, true);
	});

	it('parses enhanced status code', () => {
		const r = parseSmtpResponse(['250 2.1.0 OK']);
		assert.equal(r.enhanced, '2.1.0');
	});

	it('parses 354', () => {
		const r = parseSmtpResponse(['354 Start input']);
		assert.equal(r.code, 354);
	});

	it('parses 421', () => {
		const r = parseSmtpResponse(['421 4.3.2 Service not available']);
		assert.equal(r.code, 421);
	});

	it('parses 550', () => {
		const r = parseSmtpResponse(['550 User unknown']);
		assert.equal(r.code, 550);
	});
});

describe('categorizeSmtpError', () => {
	it('categorizes 2xx as success', () => {
		assert.equal(categorizeSmtpError(250), 'success');
	});

	it('categorizes 4xx as temporary', () => {
		assert.equal(categorizeSmtpError(421), 'temporary');
	});

	it('categorizes 5xx as permanent', () => {
		assert.equal(categorizeSmtpError(550), 'permanent');
	});
});
