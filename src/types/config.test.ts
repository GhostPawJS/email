import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AuthConfig, EmailConfig } from './config.ts';

describe('EmailConfig', () => {
	it('constructs with password auth', () => {
		const a: AuthConfig = { user: 'u', pass: 'p' };
		const c: EmailConfig = {
			imap: { host: 'i', port: 993 },
			smtp: { host: 's', port: 465 },
			auth: a,
		};
		assert.equal(c.imap.port, 993);
	});

	it('constructs with OAuth auth', () => {
		const a: AuthConfig = { user: 'u', accessToken: 't' };
		const c: EmailConfig = {
			imap: { host: 'i', port: 993 },
			smtp: { host: 's', port: 465 },
			auth: a,
			storage: ':memory:',
			identities: [{ address: 'me@x.com' }],
		};
		assert.equal(c.storage, ':memory:');
	});
});
