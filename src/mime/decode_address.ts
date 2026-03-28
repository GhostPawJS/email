import type { Address } from '../types/address.ts';
import { decodeEncodedWords } from './decode_encoded_words.ts';

function trimToken(s: string): string {
	return s.trim();
}

/** Parse a single RFC 5322 address or group. */
export function decodeAddress(raw: string): Address | null {
	const t = trimToken(raw);
	if (!t || /^undisclosed-recipients:/i.test(t)) {
		return null;
	}
	// Quoted display name: "Name" <addr>
	const quotedName = t.match(/^"((?:[^"\\]|\\.)*)"\s*<([^>]+)>/);
	if (quotedName) {
		const name = decodeEncodedWords((quotedName[1] ?? '').replace(/\\"/g, '"'));
		const a: Address = { address: trimToken(quotedName[2] ?? '') };
		if (name) a.name = name;
		return a;
	}
	// Encoded word display name: =?...?= <addr>
	const encodedName = t.match(/^((?:=\?[^?]+\?[BbQq]\?[^?]*\?=\s*)+)<([^>]+)>/);
	if (encodedName) {
		const name = decodeEncodedWords(trimToken(encodedName[1] ?? ''));
		const a: Address = { address: trimToken(encodedName[2] ?? '') };
		if (name) a.name = name;
		return a;
	}
	// Unquoted display name: Name <addr>
	const unquotedName = t.match(/^([^<]+)\s*<([^>]+)>/);
	if (unquotedName) {
		const nameRaw = trimToken(unquotedName[1] ?? '');
		const name = decodeEncodedWords(nameRaw);
		const a: Address = { address: trimToken(unquotedName[2] ?? '') };
		if (name) a.name = name;
		return a;
	}
	// Bare <addr>
	const bare = t.match(/^<([^>]+)>/);
	if (bare) {
		return { address: trimToken(bare[1] ?? '') };
	}
	// Plain email
	if (t.includes('@')) {
		return { address: t };
	}
	return null;
}

function splitAddressList(raw: string): string[] {
	const out: string[] = [];
	let depth = 0;
	let cur = '';
	for (let i = 0; i < raw.length; i++) {
		const c = raw[i];
		if (c === '"' && (i === 0 || raw[i - 1] !== '\\')) {
			depth ^= 1;
			cur += c;
			continue;
		}
		if (c === ',' && depth === 0) {
			out.push(cur);
			cur = '';
			continue;
		}
		cur += c;
	}
	if (cur.trim()) out.push(cur);
	return out;
}

export function decodeAddressList(raw: string): Address[] {
	const t = trimToken(raw);
	if (t === '' || /^undisclosed-recipients:\s*;?\s*$/i.test(t)) {
		return [];
	}
	return splitAddressList(t)
		.map((s) => decodeAddress(s))
		.filter((a): a is Address => a !== null && a.address !== '');
}
