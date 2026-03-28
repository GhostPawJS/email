import { DEFAULT_MAX_NESTING_DEPTH } from '../types/defaults.ts';
import { parseHeaders } from './parse_headers.ts';

export type MimePart = {
	headers: Map<string, string[]>;
	body: Buffer;
	children?: MimePart[];
};

export function parseMultipart(
	body: Buffer,
	boundary: string,
	depth = 0,
	maxDepth = DEFAULT_MAX_NESTING_DEPTH,
): MimePart[] {
	if (depth > maxDepth) return [];
	const b = boundary.trim();
	const delim = Buffer.from(`--${b}`, 'utf8');
	const close = Buffer.from(`--${b}--`, 'utf8');
	const out: MimePart[] = [];
	let pos = 0;
	while (pos < body.length) {
		const idx = body.indexOf(delim, pos);
		if (idx < 0) break;
		let cur = idx + delim.length;
		if (cur + 1 < body.length && body[cur] === 0x2d && body[cur + 1] === 0x2d) {
			break;
		}
		if (cur + 1 < body.length && body[cur] === 0x0d && body[cur + 1] === 0x0a) {
			cur += 2;
		} else if (cur < body.length && body[cur] === 0x0a) {
			cur += 1;
		}
		const next = body.indexOf(delim, cur);
		const end = next >= 0 ? next : body.length;
		let partSlice = body.subarray(cur, end);
		if (partSlice.length >= close.length && partSlice.subarray(0, close.length).equals(close)) {
			break;
		}
		const sep = Buffer.from('\r\n\r\n');
		const sepIdx = partSlice.indexOf(sep);
		if (sepIdx < 0) {
			pos = end;
			continue;
		}
		const headerText = partSlice.subarray(0, sepIdx).toString('utf8');
		partSlice = partSlice.subarray(sepIdx + sep.length);
		const headers = parseHeaders(headerText);
		const ct = headers.get('content-type')?.[0] ?? '';
		let children: MimePart[] | undefined;
		if (/^multipart\//i.test(ct)) {
			const m = ct.match(/boundary=([^;\s]+|"[^"]+")/i);
			const sub = m?.[1]?.replace(/^"|"$/g, '') ?? '';
			if (sub) {
				children = parseMultipart(partSlice, sub, depth + 1, maxDepth);
			}
		}
		const mp: MimePart = {
			headers,
			body: children ? Buffer.alloc(0) : partSlice,
		};
		if (children) mp.children = children;
		out.push(mp);
		pos = end;
	}
	return out;
}
