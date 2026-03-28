import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseEhloCapabilities, SmtpConnection } from './connection.ts';

describe('SmtpConnection', () => {
	it('instantiates without error', () => {
		const conn = new SmtpConnection({ host: 'smtp.example.com', port: 587 });
		assert.equal(conn.maxSize, null);
		assert.equal(conn.capabilities.size, 0);
	});
});

describe('parseEhloCapabilities', () => {
	it('parses AUTH with multiple mechanisms', () => {
		const caps = parseEhloCapabilities(
			'smtp.web.de\nAUTH PLAIN LOGIN CRAM-MD5\nSTARTTLS\nSIZE 69920427\nOK',
		);
		assert.equal(caps.get('AUTH'), 'PLAIN LOGIN CRAM-MD5');
	});

	it('parses SIZE as a value', () => {
		const caps = parseEhloCapabilities('smtp.test\nSIZE 69920427');
		assert.equal(caps.get('SIZE'), '69920427');
	});

	it('parses STARTTLS with empty value', () => {
		const caps = parseEhloCapabilities('smtp.test\nSTARTTLS');
		assert.equal(caps.get('STARTTLS'), '');
	});

	it('uppercases all keys', () => {
		const caps = parseEhloCapabilities('smtp.test\nauth plain login\nstarttls');
		assert.ok(caps.has('AUTH'));
		assert.ok(caps.has('STARTTLS'));
	});

	it('handles empty message', () => {
		const caps = parseEhloCapabilities('');
		assert.equal(caps.size, 0);
	});

	it('handles single-line greeting only', () => {
		const caps = parseEhloCapabilities('smtp.example.com');
		assert.equal(caps.size, 1);
		assert.equal(caps.get('SMTP.EXAMPLE.COM'), '');
	});
});
