import { EmailAuthError } from '../errors.ts';
import { encodeBase64 } from '../lib/base64.ts';
import type { AuthConfig } from '../types/config.ts';
import type { SmtpConnection } from './connection.ts';

function saslPlainPayload(user: string, pass: string): string {
	return encodeBase64(Buffer.from(`\x00${user}\x00${pass}`, 'utf8'));
}

function xoauth2Payload(user: string, token: string): string {
	return encodeBase64(Buffer.from(`user=${user}\x01auth=Bearer ${token}\x01\x01`, 'utf8'));
}

export async function smtpAuthenticate(conn: SmtpConnection, config: AuthConfig): Promise<void> {
	const authLine = [...conn.capabilities.entries()].find(([k]) => k === 'AUTH')?.[1] ?? '';
	const mechs = authLine.split(/\s+/).map((m) => m.toUpperCase());

	if ('accessToken' in config) {
		if (mechs.includes('XOAUTH2')) {
			const resp = await conn.sendCommand(
				`AUTH XOAUTH2 ${xoauth2Payload(config.user, config.accessToken)}`,
			);
			if (resp.code >= 200 && resp.code < 300) return;
			throw new EmailAuthError('SMTP XOAUTH2 failed', 'XOAUTH2');
		}
		throw new EmailAuthError('No OAuth mechanism available', 'oauth');
	}

	if ('user' in config && 'pass' in config) {
		const { user, pass } = config;
		if (mechs.includes('PLAIN')) {
			const resp = await conn.sendCommand(`AUTH PLAIN ${saslPlainPayload(user, pass)}`);
			if (resp.code >= 200 && resp.code < 300) return;
			throw new EmailAuthError('SMTP PLAIN auth failed', 'PLAIN');
		}
		if (mechs.includes('LOGIN')) {
			await conn.sendCommand(`AUTH LOGIN ${encodeBase64(Buffer.from(user, 'utf8'))}`);
			const resp = await conn.sendCommand(encodeBase64(Buffer.from(pass, 'utf8')));
			if (resp.code >= 200 && resp.code < 300) return;
			throw new EmailAuthError('SMTP LOGIN auth failed', 'LOGIN');
		}
		throw new EmailAuthError('No supported SMTP auth mechanism', 'none');
	}

	throw new EmailAuthError('Unknown auth configuration', 'unknown');
}
