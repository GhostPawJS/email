import type { Address } from '../types/address.ts';
import { decodeAddress, decodeAddressList } from './decode_address.ts';
import { decodeContentDisposition } from './decode_content_disposition.ts';
import { decodeContentType } from './decode_content_type.ts';
import { decodeDate } from './decode_date.ts';
import { decodeEncodedWords } from './decode_encoded_words.ts';

export type StructuredHeaders = {
	from: Address | null;
	to: Address[];
	cc: Address[];
	bcc: Address[];
	replyTo: Address | null;
	subject: string | null;
	date: string | null;
	messageId: string | null;
	inReplyTo: string | null;
	references: string[];
	contentType: ReturnType<typeof decodeContentType> | null;
	contentDisposition: ReturnType<typeof decodeContentDisposition> | null;
	contentTransferEncoding: string | null;
};

function angleIds(s: string): string[] {
	const out: string[] = [];
	const re = /<([^>]+)>/g;
	let m: RegExpExecArray | null;
	m = re.exec(s);
	while (m !== null) {
		out.push(m[1]?.trim() ?? '');
		m = re.exec(s);
	}
	return out;
}

export function parseStructuredHeaders(headers: Map<string, string[]>): StructuredHeaders {
	const g = (k: string) => headers.get(k)?.[0];
	const fromRaw = g('from');
	const toRaw = g('to');
	const sub = g('subject');
	const dateRaw = g('date');
	const ct = g('content-type');
	const cd = g('content-disposition');
	const cte = g('content-transfer-encoding');
	const refRaw = g('references');
	const irt = g('in-reply-to');
	const mid = g('message-id');
	return {
		from: fromRaw ? decodeAddress(fromRaw) : null,
		to: toRaw ? decodeAddressList(toRaw) : [],
		cc: g('cc') ? decodeAddressList(g('cc') ?? '') : [],
		bcc: g('bcc') ? decodeAddressList(g('bcc') ?? '') : [],
		replyTo: g('reply-to') ? decodeAddress(g('reply-to') ?? '') : null,
		subject: sub ? decodeEncodedWords(sub) : null,
		date: dateRaw ? decodeDate(dateRaw) : null,
		messageId: mid ? (angleIds(mid)[0] ?? mid.trim().replace(/^<|>$/g, '')) : null,
		inReplyTo: irt ? (angleIds(irt)[0] ?? irt.trim().replace(/^<|>$/g, '')) : null,
		references: refRaw
			? refRaw
					.split(/\s+/)
					.flatMap((x) => angleIds(x))
					.filter(Boolean)
			: [],
		contentType: ct ? decodeContentType(ct) : null,
		contentDisposition: cd ? decodeContentDisposition(cd) : null,
		contentTransferEncoding: cte ? cte.trim().toLowerCase() : null,
	};
}
