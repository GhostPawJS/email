import type { EmailConfig } from '../types/config.ts';
import { smtpAuthenticate } from './auth.ts';
import { SmtpConnection } from './connection.ts';
import type { SmtpEnvelope } from './send_message.ts';
import { sendSmtpMessage } from './send_message.ts';

export type { SmtpEnvelope } from './send_message.ts';

export async function smtpSend(
	config: EmailConfig,
	composed: Buffer,
	envelope: SmtpEnvelope,
): Promise<void> {
	const connOpts: { host: string; port: number; tls?: boolean } = {
		host: config.smtp.host,
		port: config.smtp.port,
	};
	if (config.smtp.tls !== undefined) connOpts.tls = config.smtp.tls;
	const conn = new SmtpConnection(connOpts);
	await conn.connect();
	await smtpAuthenticate(conn, config.auth);
	await sendSmtpMessage(conn, envelope, composed);
	await conn.disconnect();
}
