import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Mailbox } from './mailbox.ts';

describe('Mailbox', () => {
	it('starts disconnected and throws on surface access', () => {
		const mb = new Mailbox({
			imap: { host: 'imap.example.com', port: 993 },
			smtp: { host: 'smtp.example.com', port: 587 },
			auth: { user: 'u', pass: 'p' },
		});
		assert.equal(mb.isConnected(), false);
		assert.throws(() => mb.read, /not connected/i);
		assert.throws(() => mb.write, /not connected/i);
		assert.throws(() => mb.network, /not connected/i);
	});
});
