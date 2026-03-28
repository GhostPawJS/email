export function encodeBase64(buf: Buffer): string {
	return buf.toString('base64');
}

export function decodeBase64(str: string): Buffer {
	return Buffer.from(str, 'base64');
}

export function encodeBase64Lines(buf: Buffer, lineLen = 76): string {
	const b64 = encodeBase64(buf);
	const lines: string[] = [];
	for (let i = 0; i < b64.length; i += lineLen) {
		lines.push(b64.slice(i, i + lineLen));
	}
	return lines.join('\r\n');
}
