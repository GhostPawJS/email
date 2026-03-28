import type { Address } from '../types/address.ts';
import type { ParsedEnvelope } from '../types/imap_response.ts';
import { decodeEncodedWords } from './decode_encoded_words.ts';

/**
 * Works with the output of collectItems() in response_parser.ts, where:
 *   - IMAP NIL  → null
 *   - quoted / atom / number  → string | number
 *   - parenthesised groups    → nested unknown[]
 */
type Item = unknown;

function s(v: Item): string | null {
	if (v === null || v === undefined) return null;
	if (typeof v === 'string') return v || null; // treat empty string as null
	if (typeof v === 'number') return String(v);
	if (Buffer.isBuffer(v)) return v.toString('utf8') || null;
	return null;
}

/**
 * Parse an address list.
 * After collectItems: an address list is a nested array of address arrays,
 * each address being [personalName, sourceRoute, mailboxName, hostName].
 */
function parseAddressList(items: Item): Address[] {
	if (!Array.isArray(items)) return [];
	const out: Address[] = [];
	for (const entry of items as Item[]) {
		if (!Array.isArray(entry)) continue;
		const addrArr = entry as Item[];
		const nameRaw = s(addrArr[0]);
		// addrArr[1] is the source-route — RFC 2822 deprecated, ignored
		const mailbox = s(addrArr[2]);
		const host = s(addrArr[3]);
		if (!mailbox || !host) continue;
		const address = `${mailbox}@${host}`;
		const name = nameRaw ? decodeEncodedWords(nameRaw) : undefined;
		out.push(name ? { name, address } : { address });
	}
	return out;
}

/**
 * Decode an IMAP ENVELOPE response into a ParsedEnvelope.
 *
 * ENVELOPE data layout (RFC 3501 §7.4.2):
 *   [date, subject, from, sender, reply-to, to, cc, bcc, in-reply-to, message-id]
 */
export function decodeEnvelope(data: unknown[]): ParsedEnvelope {
	const [
		dateRaw,
		subjectRaw,
		fromRaw,
		senderRaw,
		replyToRaw,
		toRaw,
		ccRaw,
		bccRaw,
		irtRaw,
		midRaw,
	] = data;

	const dateStr = s(dateRaw);
	const subjectStr = s(subjectRaw);

	return {
		date: dateStr,
		subject: subjectStr ? decodeEncodedWords(subjectStr) : null,
		from: parseAddressList(fromRaw),
		sender: parseAddressList(senderRaw),
		replyTo: parseAddressList(replyToRaw),
		to: parseAddressList(toRaw),
		cc: parseAddressList(ccRaw),
		bcc: parseAddressList(bccRaw),
		inReplyTo: s(irtRaw),
		messageId: s(midRaw),
	};
}
