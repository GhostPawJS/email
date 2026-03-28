import { unfoldHeaders } from './unfold_headers.ts';

/** Split header block into name -> values (lowercase names). */
export function parseHeaders(raw: string): Map<string, string[]> {
	const map = new Map<string, string[]>();
	const text = raw.includes('\r\n') ? unfoldHeaders(raw.replace(/\r\n/g, '\r\n')) : raw;
	const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
	const folded: string[] = [];
	for (const line of lines) {
		if (/^[ \t]/.test(line) && folded.length > 0) {
			folded[folded.length - 1] += ` ${line.trim()}`;
		} else {
			folded.push(line);
		}
	}
	for (const line of folded) {
		const c = line.indexOf(':');
		if (c < 0) continue;
		const name = line.slice(0, c).trim().toLowerCase();
		const val = line.slice(c + 1).trim();
		const arr = map.get(name) ?? [];
		arr.push(val);
		map.set(name, arr);
	}
	return map;
}
