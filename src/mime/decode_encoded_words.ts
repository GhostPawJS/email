/**
 * RFC 2047 encoded-word decoding.
 */

const encodedWord = /=\?([\w*.-]+)\?([BbQq])\?([^?]*)\?=/g;

function decodeQPayload(payload: string): Buffer {
	const bytes: number[] = [];
	for (let i = 0; i < payload.length; i++) {
		const c = payload[i];
		if (c === '_') {
			bytes.push(0x20);
			continue;
		}
		if (c === '=' && i + 2 < payload.length) {
			const h = payload.slice(i + 1, i + 3);
			if (/^[0-9A-Fa-f]{2}$/.test(h)) {
				bytes.push(Number.parseInt(h, 16));
				i += 2;
				continue;
			}
		}
		bytes.push(payload.charCodeAt(i) & 0xff);
	}
	return Buffer.from(bytes);
}

function normalizeCharset(charset: string): string {
	const c = charset.trim().toLowerCase();
	if (c === 'utf8') return 'utf-8';
	return c;
}

export function decodeEncodedWords(raw: string): string {
	let out = '';
	let lastEnd = 0;
	let lastWasEncoded = false;
	let m: RegExpExecArray | null;
	encodedWord.lastIndex = 0;
	m = encodedWord.exec(raw);
	while (m !== null) {
		const start = m.index;
		const full = m[0];
		const charset = m[1] ?? 'utf-8';
		const enc = m[2] ?? 'B';
		const text = m[3] ?? '';

		const gap = raw.slice(lastEnd, start);
		const gapOnlyWs = /^\s*$/.test(gap);
		if (!lastWasEncoded || !gapOnlyWs) {
			out += gap;
		}

		const cs = normalizeCharset(charset);
		let buf: Buffer;
		if (enc.toUpperCase() === 'B') {
			buf = Buffer.from(text.replace(/\s+/g, ''), 'base64');
		} else {
			buf = decodeQPayload(text);
		}
		try {
			out += new TextDecoder(cs).decode(buf);
		} catch {
			out += buf.toString('binary');
		}
		lastWasEncoded = true;
		lastEnd = start + full.length;
		m = encodedWord.exec(raw);
	}
	out += raw.slice(lastEnd);
	return out;
}
