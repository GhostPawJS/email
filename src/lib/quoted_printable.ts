const HEX = '0123456789ABCDEF';

function encodeByte(b: number): string {
	return `=${HEX[(b >> 4) & 0xf]}${HEX[b & 0xf]}`;
}

export function encodeQP(input: Buffer): string {
	let out = '';
	let lineLen = 0;
	for (let i = 0; i < input.length; i++) {
		const b = input[i] ?? 0;
		let chunk: string;
		if (b === 0x20 || b === 0x09) {
			chunk = String.fromCharCode(b);
		} else if (b >= 33 && b <= 60 && b !== 61) {
			chunk = String.fromCharCode(b);
		} else if (b >= 62 && b <= 126) {
			chunk = String.fromCharCode(b);
		} else {
			chunk = encodeByte(b);
		}
		if (lineLen + chunk.length > 75) {
			out += '=\r\n';
			lineLen = 0;
		}
		out += chunk;
		lineLen += chunk.length;
	}
	return out;
}

export function decodeQP(input: string): Buffer {
	const bytes: number[] = [];
	for (let i = 0; i < input.length; i++) {
		const c = input[i];
		if (c === '=' && i + 2 < input.length) {
			const a = input[i + 1];
			const b = input[i + 2];
			if (a === '\r' && b === '\n') {
				i += 2;
				continue;
			}
			const hi = Number.parseInt(`${a}${b}`, 16);
			if (!Number.isNaN(hi)) {
				bytes.push(hi);
				i += 2;
				continue;
			}
		}
		if (c !== undefined) bytes.push(c.charCodeAt(0));
	}
	return Buffer.from(bytes);
}
