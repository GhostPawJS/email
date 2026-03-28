import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EmailAuthError } from '../errors.ts';
import { smtpAuthenticate } from './auth.ts';
import { SmtpConnection } from './connection.ts';

describe('smtpAuthenticate', () => {
	it('throws EmailAuthError when no mechanism matches', async () => {
		const conn = new SmtpConnection({ host: 'smtp.example.com', port: 587 });
		await assert.rejects(() => smtpAuthenticate(conn, { user: 'u', pass: 'p' }), EmailAuthError);
	});
});
