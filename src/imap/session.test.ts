import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ImapSession } from './session.ts';

describe('ImapSession', () => {
	it('starts disconnected', () => {
		const session = new ImapSession({
			imap: { host: 'imap.example.com', port: 993 },
			smtp: { host: 'smtp.example.com', port: 587 },
			auth: { user: 'u', pass: 'p' },
		});
		assert.equal(session.selectedFolder, null);
		assert.equal(session.capabilities.size, 0);
		assert.throws(() => session.dispatcher, /not connected/i);
	});
});
