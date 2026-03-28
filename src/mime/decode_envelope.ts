import type { Address } from '../types/address.ts';
import type { ImapToken, ParsedEnvelope } from '../types/imap_response.ts';
import { decodeEncodedWords } from './decode_encoded_words.ts';

function tokStr(t: ImapToken | undefined): string | null {
	if (!t) return null;
	if (t.type === 'nil') return null;
	if (t.type === 'quoted' || t.type === 'atom') return String(t.value ?? '');
	if (t.type === 'number') return String(t.value ?? '');
	return null;
}

function parseAddressList(tokens: ImapToken[], i: { v: number }): Address[] {
	const out: Address[] = [];
	const t = tokens[i.v];
	if (!t || t.type === 'nil') {
		i.v += 1;
		return out;
	}
	if (t.type !== 'lparen') {
		i.v += 1;
		return out;
	}
	i.v += 1;
	while (i.v < tokens.length) {
		const cur = tokens[i.v];
		if (cur?.type === 'rparen') {
			i.v += 1;
			break;
		}
		if (cur?.type === 'lparen') {
			i.v += 1;
			const name = tokStr(tokens[i.v]);
			i.v += 1;
			i.v += 1;
			const mailbox = tokStr(tokens[i.v]);
			i.v += 1;
			const host = tokStr(tokens[i.v]);
			i.v += 1;
			if (tokens[i.v]?.type === 'rparen') i.v += 1;
			const addr = mailbox && host ? `${mailbox}@${host}` : '';
			if (addr) {
				if (name) {
					out.push({ name: decodeEncodedWords(name), address: addr });
				} else {
					out.push({ address: addr });
				}
			}
		} else {
			i.v += 1;
		}
	}
	return out;
}

export function decodeEnvelope(tokens: ImapToken[]): ParsedEnvelope {
	const i = { v: 0 };
	if (tokens[i.v]?.type === 'lparen') i.v += 1;
	const date = tokStr(tokens[i.v]);
	i.v += 1;
	const subjectRaw = tokStr(tokens[i.v]);
	i.v += 1;
	const subject = subjectRaw ? decodeEncodedWords(subjectRaw) : null;
	const from = parseAddressList(tokens, i);
	const sender = parseAddressList(tokens, i);
	const replyTo = parseAddressList(tokens, i);
	const to = parseAddressList(tokens, i);
	const cc = parseAddressList(tokens, i);
	const bcc = parseAddressList(tokens, i);
	const irtRaw = tokStr(tokens[i.v]);
	i.v += 1;
	const midRaw = tokStr(tokens[i.v]);
	i.v += 1;
	if (tokens[i.v]?.type === 'rparen') i.v += 1;
	return {
		date,
		subject,
		from,
		sender,
		replyTo,
		to,
		cc,
		bcc,
		inReplyTo: irtRaw,
		messageId: midRaw,
	};
}
