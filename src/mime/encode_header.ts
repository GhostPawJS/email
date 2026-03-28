/** Encode header line with RFC 2047 B-encoding for non-ASCII. */
export function encodeHeader(name: string, value: string): string {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally matching non-ASCII
	const needs = /[^\x00-\x7f]/.test(value);
	if (!needs) {
		const line = `${name}: ${value}`;
		return `${foldLine(line)}\r\n`;
	}
	const b64 = Buffer.from(value, 'utf8').toString('base64');
	const enc = `=?UTF-8?B?${b64}?=`;
	return `${foldLine(`${name}: ${enc}`)}\r\n`;
}

function foldLine(s: string, max = 76): string {
	if (s.length <= max) return s;
	const parts: string[] = [];
	let i = 0;
	while (i < s.length) {
		parts.push(s.slice(i, i + max));
		i += max;
	}
	return parts.join('\r\n ');
}
