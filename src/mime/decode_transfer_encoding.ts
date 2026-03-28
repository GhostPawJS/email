import { decodeBase64 } from '../lib/base64.ts';
import { decodeQP } from '../lib/quoted_printable.ts';

export function decodeTransferEncoding(data: Buffer | string, encoding: string): Buffer {
	const enc = encoding.trim().toLowerCase();
	if (enc === '7bit' || enc === '8bit' || enc === 'binary') {
		return typeof data === 'string' ? Buffer.from(data, 'binary') : Buffer.from(data);
	}
	if (enc === 'base64') {
		const s =
			typeof data === 'string'
				? data.replace(/\s+/g, '')
				: data.toString('utf8').replace(/\s+/g, '');
		return decodeBase64(s);
	}
	if (enc === 'quoted-printable') {
		const s = typeof data === 'string' ? data : data.toString('latin1');
		return decodeQP(s);
	}
	return typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
}
