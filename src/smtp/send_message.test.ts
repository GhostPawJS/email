import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EmailValidationError } from '../errors.ts';
import { SmtpConnection } from './connection.ts';
import { sendSmtpMessage } from './send_message.ts';

describe('sendSmtpMessage', () => {
	it('throws EmailValidationError when message exceeds maxSize', async () => {
		const conn = new SmtpConnection({ host: 'smtp.example.com', port: 587 });
		// Manually set maxSize for test
		Object.defineProperty(conn, 'maxSize', { get: () => 10 });
		const largeMessage = Buffer.alloc(100, 'x');
		await assert.rejects(
			() => sendSmtpMessage(conn, { from: 'a@b.com', to: ['c@d.com'] }, largeMessage),
			EmailValidationError,
		);
	});
});
