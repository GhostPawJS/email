import type { BodyPart } from '../types/body_part.ts';
import { DEFAULT_MAX_NESTING_DEPTH } from '../types/defaults.ts';

/** Accept the raw ImapToken[] OR already-grouped unknown[] from collectItems. */
type Item = unknown;

function s(v: Item): string {
	if (v === null || v === undefined) return '';
	if (Array.isArray(v)) return '';
	return String(v);
}

function n(v: Item): number {
	const num = Number(s(v));
	return Number.isNaN(num) ? 0 : num;
}

function parseParams(data: Item[], i: { idx: number }): Record<string, string> {
	const item = data[i.idx];
	if (!Array.isArray(item)) {
		i.idx++;
		return {};
	}
	i.idx++;
	const list = item as Item[];
	const out: Record<string, string> = {};
	for (let j = 0; j + 1 < list.length; j += 2) {
		const k = s(list[j]).toLowerCase();
		const val = s(list[j + 1]);
		if (k) out[k] = val;
	}
	return out;
}

/**
 * Parse optional Content-Disposition extended field from a BODYSTRUCTURE.
 * Format: NIL  |  ("inline" NIL)  |  ("attachment" ("filename" "report.pdf"))
 */
function parseDisposition(
	data: Item[],
	i: { idx: number },
): { type: string; params: Record<string, string> } | null {
	const item = data[i.idx];
	if (item === null || item === undefined) {
		i.idx++;
		return null; // NIL — no disposition
	}
	if (!Array.isArray(item)) {
		i.idx++;
		return null;
	}
	i.idx++;
	const list = item as Item[];
	if (!list.length) return null;
	const type = s(list[0]).toLowerCase();
	const params: Record<string, string> = {};
	if (Array.isArray(list[1])) {
		const plist = list[1] as Item[];
		for (let j = 0; j + 1 < plist.length; j += 2) {
			const k = s(plist[j]).toLowerCase();
			const val = s(plist[j + 1]);
			if (k) params[k] = val;
		}
	}
	return { type, params };
}

function parsePart(data: Item[], basePath: string, depth: number, maxDepth: number): BodyPart {
	if (depth > maxDepth) {
		return {
			type: 'text',
			subtype: 'plain',
			params: {},
			id: null,
			description: null,
			encoding: '7bit',
			size: 0,
			partPath: basePath || '1',
		};
	}

	// Multipart: first element is also an array (nested body part)
	if (Array.isArray(data[0])) {
		const children: BodyPart[] = [];
		let childCount = 0;
		let idx = 0;
		while (idx < data.length && Array.isArray(data[idx])) {
			childCount++;
			const path = basePath ? `${basePath}.${childCount}` : String(childCount);
			children.push(parsePart(data[idx] as Item[], path, depth + 1, maxDepth));
			idx++;
		}
		const sub = s(data[idx]).toLowerCase();
		// Extended multipart fields (params, disposition, …) are not used in current schema
		return {
			type: 'multipart',
			subtype: sub,
			params: {},
			id: null,
			description: null,
			encoding: '7bit',
			size: 0,
			children,
			partPath: basePath || '1',
		};
	}

	// Leaf part: [type, subtype, params, id, desc, encoding, size, ...]
	const i = { idx: 0 };
	const type = s(data[i.idx++]).toLowerCase();
	const subtype = s(data[i.idx++]).toLowerCase();
	const params = parseParams(data, i);
	const id = s(data[i.idx]) || null;
	i.idx++;
	const desc = s(data[i.idx]) || null;
	i.idx++;
	const enc = s(data[i.idx]) || '7bit';
	i.idx++;
	const size = n(data[i.idx++]);

	const leaf: BodyPart = {
		type,
		subtype,
		params,
		id,
		description: desc,
		encoding: enc,
		size,
		partPath: basePath || '1',
	};
	if (type === 'text') {
		leaf.lines = n(data[i.idx]);
		i.idx++;
	}
	// Extended fields (RFC 3501 §7.4.2): md5, disposition, language, location
	if (i.idx < data.length) i.idx++; // skip md5
	if (i.idx < data.length) {
		const disposition = parseDisposition(data, i);
		if (disposition) leaf.disposition = disposition;
	}
	return leaf;
}

/**
 * Decode a BODYSTRUCTURE from grouped item data.
 * The input is the data array returned by collectItems for the BODYSTRUCTURE value —
 * parens have been converted to nested arrays, NIL to null, numbers to numbers.
 */
export function decodeBodyStructure(
	data: unknown[],
	maxDepth = DEFAULT_MAX_NESTING_DEPTH,
): BodyPart {
	if (!data.length) {
		return {
			type: 'text',
			subtype: 'plain',
			params: {},
			id: null,
			description: null,
			encoding: '7bit',
			size: 0,
			partPath: '1',
		};
	}
	return parsePart(data, '', 0, maxDepth);
}
