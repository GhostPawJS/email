const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+,';

function utf16beToBytes(codeUnits: number[]): Buffer {
	const buf = Buffer.alloc(codeUnits.length * 2);
	for (let i = 0; i < codeUnits.length; i++) {
		const u = codeUnits[i] ?? 0;
		buf.writeUInt16BE(u, i * 2);
	}
	return buf;
}

function encodeB64Utf16(codeUnits: number[]): string {
	if (codeUnits.length === 0) return '';
	const bytes = utf16beToBytes(codeUnits);
	let buffer = 0;
	let n = 0;
	let out = '';
	for (let i = 0; i < bytes.length; i++) {
		const b = bytes[i] ?? 0;
		buffer = (buffer << 8) | b;
		n += 8;
		while (n >= 6) {
			n -= 6;
			const idx = (buffer >> n) & 0x3f;
			out += B64[idx] ?? '';
		}
	}
	if (n > 0) {
		const idx = (buffer << (6 - n)) & 0x3f;
		out += B64[idx] ?? '';
	}
	while (out.length % 4 !== 0) out += ',';
	return out.replace(/,+$/, '');
}

export function encodeMailboxName(utf8: string): string {
	const str = utf8;
	let out = '';
	let shift: number[] = [];
	const flush = () => {
		if (shift.length === 0) return;
		out += `&${encodeB64Utf16(shift)}-`;
		shift = [];
	};
	for (let i = 0; i < str.length; i++) {
		const c = str.codePointAt(i);
		if (c === undefined) continue;
		if (c > 0xffff) i++;
		if (c === 0x26) {
			flush();
			out += '&-';
			continue;
		}
		if (c >= 0x20 && c <= 0x7e && c !== 0x26) {
			flush();
			out += String.fromCodePoint(c);
		} else {
			if (c <= 0xffff) shift.push(c);
			else {
				const u = c - 0x1_0000;
				shift.push(0xd800 + (u >> 10));
				shift.push(0xdc00 + (u & 0x3ff));
			}
		}
	}
	flush();
	return out;
}

function decodeB64(s: string): string {
	let bits = 0;
	let buffer = 0;
	const bytes: number[] = [];
	for (let i = 0; i < s.length; i++) {
		const ch = s[i] ?? '';
		const idx = B64.indexOf(ch);
		if (idx < 0) continue;
		buffer = (buffer << 6) | idx;
		bits += 6;
		if (bits >= 8) {
			bits -= 8;
			bytes.push((buffer >> bits) & 0xff);
		}
	}
	const buf = Buffer.from(bytes);
	let out = '';
	for (let i = 0; i + 1 < buf.length; i += 2) {
		out += String.fromCharCode(buf.readUInt16BE(i));
	}
	return out;
}

export function decodeMailboxName(mutf7: string): string {
	let out = '';
	let i = 0;
	while (i < mutf7.length) {
		const ch = mutf7[i];
		if (ch === '&') {
			if (mutf7[i + 1] === '-') {
				out += '&';
				i += 2;
				continue;
			}
			const end = mutf7.indexOf('-', i + 1);
			if (end < 0) break;
			const payload = mutf7.slice(i + 1, end);
			out += decodeB64(payload);
			i = end + 1;
			continue;
		}
		out += ch ?? '';
		i++;
	}
	return out;
}
