import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SmtpConnection } from './connection.ts';

describe('SmtpConnection', () => {
	it('instantiates without error', () => {
		const conn = new SmtpConnection({ host: 'smtp.example.com', port: 587 });
		assert.equal(conn.maxSize, null);
		assert.equal(conn.capabilities.size, 0);
	});
});
