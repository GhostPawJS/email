import { generateBoundary, generateMessageId } from '../lib/generate_id.ts';
import type { ComposeInput } from '../types/compose.ts';
import { encodeAddress, encodeAddressList } from './encode_address.ts';
import { encodeAttachment } from './encode_attachment.ts';
import { encodeDate } from './encode_date.ts';
import { encodeHeader } from './encode_header.ts';

export function composeMessage(input: ComposeInput): Buffer {
	const lines: string[] = [];
	const domain = input.from.address.split('@')[1] ?? 'local';
	lines.push(encodeHeader('Message-ID', generateMessageId(domain)).trim());
	lines.push(encodeHeader('Date', encodeDate()).trim());
	lines.push('MIME-Version: 1.0');
	lines.push(encodeHeader('From', encodeAddress(input.from)).trim());
	lines.push(encodeHeader('To', encodeAddressList(input.to)).trim());
	if (input.cc?.length) {
		lines.push(encodeHeader('Cc', encodeAddressList(input.cc)).trim());
	}
	if (input.bcc?.length) {
		lines.push(encodeHeader('Bcc', encodeAddressList(input.bcc)).trim());
	}
	lines.push(encodeHeader('Subject', input.subject).trim());
	if (input.inReplyTo) {
		lines.push(encodeHeader('In-Reply-To', input.inReplyTo).trim());
	}
	if (input.references?.length) {
		lines.push(encodeHeader('References', input.references.join(' ')).trim());
	}
	if (input.headers) {
		for (const [k, v] of Object.entries(input.headers)) {
			lines.push(encodeHeader(k, v).trim());
		}
	}

	const text = input.text ?? '';
	const html = input.html ?? '';
	const atts = input.attachments ?? [];
	let body: string;

	if (atts.length === 0 && !html) {
		body = `Content-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: 7bit\r\n\r\n${text}`;
	} else if (atts.length === 0 && !text && html) {
		body = `Content-Type: text/html; charset=utf-8\r\nContent-Transfer-Encoding: 7bit\r\n\r\n${html}`;
	} else if (atts.length === 0 && text && html) {
		const b = generateBoundary();
		const p1 = `Content-Type: text/plain; charset=utf-8\r\n\r\n${text}`;
		const p2 = `Content-Type: text/html; charset=utf-8\r\n\r\n${html}`;
		body = `Content-Type: multipart/alternative; boundary="${b}"\r\n\r\n--${b}\r\n${p1}\r\n--${b}\r\n${p2}\r\n--${b}--`;
	} else {
		const b = generateBoundary();
		const inner =
			text && html
				? (() => {
						const ib = generateBoundary();
						return `--${ib}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${text}\r\n--${ib}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${html}\r\n--${ib}--`;
					})()
				: `Content-Type: text/plain; charset=utf-8\r\n\r\n${text || html}`;
		const attBlocks = atts.map((a) => encodeAttachment(a)).join('\r\n\r\n');
		body = `Content-Type: multipart/mixed; boundary="${b}"\r\n\r\n--${b}\r\n${inner}\r\n--${b}\r\n${attBlocks}\r\n--${b}--`;
	}

	const raw = `${lines.join('\r\n')}\r\n\r\n${body}`;
	return Buffer.from(raw, 'utf8');
}
