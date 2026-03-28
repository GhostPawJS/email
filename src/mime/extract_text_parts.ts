import { decodeContentType } from './decode_content_type.ts';
import { decodeTransferEncoding } from './decode_transfer_encoding.ts';
import type { MimePart } from './parse_multipart.ts';

function charsetFromHeaders(h: Map<string, string[]>): string {
	const ct = h.get('content-type')?.[0];
	if (!ct) return 'utf-8';
	const d = decodeContentType(ct);
	return d.params.charset?.replace(/^"|"$/g, '') ?? 'utf-8';
}

export function extractTextParts(parts: MimePart[]): {
	textPlain: string | null;
	textHtml: string | null;
} {
	let textPlain: string | null = null;
	let textHtml: string | null = null;

	const walk = (list: MimePart[]) => {
		for (const p of list) {
			if (p.children?.length) {
				const alt = p.children.find((c) => {
					const x = c.headers.get('content-type')?.[0] ?? '';
					return /^multipart\/alternative/i.test(x);
				});
				if (alt?.children?.length) {
					walk(alt.children);
					continue;
				}
				walk(p.children);
				continue;
			}
			const ct = p.headers.get('content-type')?.[0] ?? '';
			const d = decodeContentType(ct);
			const enc = p.headers.get('content-transfer-encoding')?.[0] ?? '7bit';
			const raw = decodeTransferEncoding(p.body, enc);
			const cs = charsetFromHeaders(p.headers);
			let text: string;
			try {
				text = new TextDecoder(cs).decode(raw);
			} catch {
				text = raw.toString('utf8');
			}
			if (d.type === 'text' && d.subtype === 'plain' && !textPlain) {
				textPlain = text;
			}
			if (d.type === 'text' && d.subtype === 'html' && !textHtml) {
				textHtml = text;
			}
		}
	};

	walk(parts);
	return { textPlain, textHtml };
}
