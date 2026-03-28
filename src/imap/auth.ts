import { EmailAuthError, EmailProtocolError } from '../errors.ts';
import { encodeBase64 } from '../lib/base64.ts';
import type { AuthConfig } from '../types/config.ts';
import type { ImapDispatcher } from './dispatcher.ts';

function saslPlainPayload(user: string, pass: string): string {
	const buf = Buffer.from(`\x00${user}\x00${pass}`, 'utf8');
	return encodeBase64(buf);
}

function xoauth2Payload(user: string, token: string): string {
	const raw = `user=${user}\x01auth=Bearer ${token}\x01\x01`;
	return encodeBase64(Buffer.from(raw, 'utf8'));
}

function oauthBearerPayload(_user: string, token: string): string {
	const raw = `n,,\x01auth=Bearer ${token}\x01host=\x01port=\x01\x01`;
	return encodeBase64(Buffer.from(raw, 'utf8'));
}

export async function authenticate(
	dispatcher: ImapDispatcher,
	capabilities: Set<string>,
	config: AuthConfig,
): Promise<void> {
	if ('accessToken' in config) {
		const { user, accessToken, refreshFn } = config;
		const tryAuth = async (token: string): Promise<void> => {
			if (capabilities.has('OAUTHBEARER')) {
				try {
					const res = await dispatcher.execute('AUTHENTICATE', [
						'OAUTHBEARER',
						oauthBearerPayload(user, token),
					]);
					if (res.tagged.status === 'OK') return;
				} catch {
					// fall through to XOAUTH2
				}
			}
			if (capabilities.has('XOAUTH2') || capabilities.has('AUTH=XOAUTH2')) {
				const res = await dispatcher.execute('AUTHENTICATE', [
					'XOAUTH2',
					xoauth2Payload(user, token),
				]);
				if (res.tagged.status === 'OK') return;
				throw new EmailAuthError('XOAUTH2 authentication failed', 'XOAUTH2');
			}
			throw new EmailAuthError('No OAuth mechanism available', 'oauth');
		};
		try {
			await tryAuth(accessToken);
		} catch (err) {
			if (refreshFn) {
				const newToken = await refreshFn();
				await tryAuth(newToken);
			} else {
				throw err instanceof EmailAuthError
					? err
					: new EmailAuthError(`OAuth authentication failed: ${String(err)}`, 'oauth');
			}
		}
		return;
	}

	if ('user' in config && 'pass' in config) {
		const { user, pass } = config;
		if (capabilities.has('AUTH=PLAIN') || capabilities.has('PLAIN')) {
			try {
				await dispatcher.execute('AUTHENTICATE', ['PLAIN', saslPlainPayload(user, pass)]);
				return;
			} catch (err) {
				if (err instanceof EmailProtocolError) {
					throw new EmailAuthError('PLAIN authentication failed', 'PLAIN');
				}
				throw err;
			}
		}
		// LOGIN
		try {
			await dispatcher.execute('LOGIN', [user, pass]);
			return;
		} catch (err) {
			if (err instanceof EmailProtocolError) {
				throw new EmailAuthError('LOGIN authentication failed', 'LOGIN');
			}
			throw err;
		}
	}

	if ('mechanism' in config) {
		const { mechanism, credentials } = config;
		const payload = encodeBase64(Buffer.from(JSON.stringify(credentials), 'utf8'));
		const res = await dispatcher.execute('AUTHENTICATE', [mechanism, payload]);
		if (res.tagged.status !== 'OK') {
			throw new EmailAuthError(`${mechanism} authentication failed`, mechanism);
		}
		return;
	}

	throw new EmailAuthError('Unknown auth configuration', 'unknown');
}
