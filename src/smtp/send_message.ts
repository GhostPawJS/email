import { EmailEnvelopeRejectedError, EmailValidationError } from '../errors.ts';
import type { SmtpConnection } from './connection.ts';
import { dotStuff } from './dot_stuffing.ts';

export type SmtpEnvelope = {
	from: string;
	to: string[];
};

export async function sendSmtpMessage(
	conn: SmtpConnection,
	envelope: SmtpEnvelope,
	message: Buffer,
): Promise<void> {
	if (conn.maxSize !== null && message.length > conn.maxSize) {
		throw new EmailValidationError(
			`Message size ${message.length} exceeds server limit ${conn.maxSize}`,
		);
	}

	const fromResp = await conn.sendCommand(`MAIL FROM:<${envelope.from}>`);
	if (fromResp.code < 200 || fromResp.code >= 300) {
		throw new EmailEnvelopeRejectedError(`MAIL FROM rejected: ${fromResp.message}`, fromResp.code);
	}

	for (const rcpt of envelope.to) {
		const rcptResp = await conn.sendCommand(`RCPT TO:<${rcpt}>`);
		if (rcptResp.code < 200 || rcptResp.code >= 300) {
			throw new EmailEnvelopeRejectedError(
				`RCPT TO rejected for ${rcpt}: ${rcptResp.message}`,
				rcptResp.code,
			);
		}
	}

	const dataResp = await conn.sendCommand('DATA');
	if (dataResp.code !== 354) {
		throw new EmailEnvelopeRejectedError(`DATA rejected: ${dataResp.message}`, dataResp.code);
	}

	// Normalize to CRLF and dot-stuff
	const text = message.toString('binary').replace(/\r?\n/g, '\r\n');
	const stuffed = dotStuff(text);
	const endResp = await conn.sendCommand(`${stuffed}\r\n.`);
	if (endResp.code < 200 || endResp.code >= 300) {
		throw new EmailEnvelopeRejectedError(`Message rejected: ${endResp.message}`, endResp.code);
	}
}
