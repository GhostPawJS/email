import type {
	ImapResponse,
	ImapToken,
	ResponseCode,
	TaggedResponse,
} from '../types/imap_response.ts';

function tokStr(tok: ImapToken | undefined): string {
	if (!tok) return '';
	if (tok.value === null) return 'NIL';
	if (Buffer.isBuffer(tok.value)) return tok.value.toString('utf8');
	return String(tok.value);
}

function tokNum(tok: ImapToken | undefined): number | null {
	if (!tok) return null;
	if (tok.type === 'number') return Number(tok.value);
	return null;
}

/**
 * Recursively collect items from a flat token array, grouping () into arrays.
 * Returns [items, endIndex].
 */
function collectItems(
	tokens: ImapToken[],
	start: number,
	stopAt: 'rbracket' | 'rparen' | null,
): { items: unknown[]; end: number } {
	const items: unknown[] = [];
	let i = start;
	while (i < tokens.length) {
		const tok = tokens[i];
		if (!tok) break;
		if (tok.type === 'crlf') {
			i++;
			continue;
		}
		if (stopAt && tok.type === stopAt) {
			i++; // consume closing delimiter
			break;
		}
		if (tok.type === 'lparen') {
			i++;
			const inner = collectItems(tokens, i, 'rparen');
			items.push(inner.items);
			i = inner.end;
		} else if (tok.type === 'lbracket') {
			i++;
			const inner = collectItems(tokens, i, 'rbracket');
			// Represent brackets as a string for section identifiers
			items.push(`[${(inner.items as unknown[]).map(String).join(' ')}]`);
			i = inner.end;
		} else if (tok.type === 'nil') {
			items.push(null);
			i++;
		} else if (tok.type === 'number') {
			items.push(Number(tok.value));
			i++;
		} else if (tok.type === 'literal') {
			items.push(tok.value instanceof Buffer ? tok.value : Buffer.from(String(tok.value)));
			i++;
		} else {
			// atom or quoted
			items.push(tokStr(tok));
			i++;
		}
	}
	return { items, end: i };
}

function parseCode(tokens: ImapToken[], start: number): { code: ResponseCode; end: number } | null {
	if (tokens[start]?.type !== 'lbracket') return null;
	let i = start + 1;
	const name = tokStr(tokens[i++]).toUpperCase();
	const values: (string | number)[] = [];
	while (i < tokens.length && tokens[i]?.type !== 'rbracket') {
		const tok = tokens[i];
		if (tok?.type === 'lparen') {
			i++;
			while (i < tokens.length && tokens[i]?.type !== 'rparen') {
				const v = tokens[i];
				if (v) values.push(tokStr(v));
				i++;
			}
			i++;
		} else if (tok) {
			if (tok.type === 'number') values.push(Number(tok.value));
			else values.push(tokStr(tok));
			i++;
		} else {
			break;
		}
	}
	const end = i + 1; // skip rbracket

	let value: ResponseCode['value'] = null;
	if (values.length === 1) {
		value = values[0] ?? null;
	} else if (values.length > 1) {
		value = values.map(String);
	}

	return { code: { code: name, value }, end };
}

export function parseResponse(tokens: ImapToken[]): ImapResponse {
	if (!tokens.length) {
		return { kind: 'tagged', tag: '', status: 'BAD', code: null, text: '' };
	}

	const first = tokens[0];

	// Continuation response
	if (first?.type === 'plus') {
		const text = tokens
			.slice(1)
			.filter((t) => t.type !== 'crlf')
			.map((t) => tokStr(t))
			.join(' ');
		return { kind: 'continuation', text };
	}

	// Untagged response
	if (first?.type === 'star') {
		let i = 1;
		let number: number | null = null;
		if (tokens[i]?.type === 'number') {
			number = tokNum(tokens[i]);
			i++;
		}
		const type = tokStr(tokens[i]).toUpperCase();
		i++;
		// response code
		let code: ResponseCode | null = null;
		if (tokens[i]?.type === 'lbracket') {
			const r = parseCode(tokens, i);
			if (r) {
				code = r.code;
				i = r.end;
			}
		}
		// remaining data — group parens into nested arrays
		const remaining = tokens.slice(i).filter((t) => t.type !== 'crlf');
		const { items } = collectItems(remaining, 0, null);
		return { kind: 'untagged', type, number, data: items, code };
	}

	// Tagged response
	const tag = tokStr(first);
	let i = 1;
	const statusStr = tokStr(tokens[i++]).toUpperCase();
	const status = (
		statusStr === 'OK' || statusStr === 'NO' || statusStr === 'BAD' ? statusStr : 'BAD'
	) as TaggedResponse['status'];
	let code: ResponseCode | null = null;
	if (tokens[i]?.type === 'lbracket') {
		const r = parseCode(tokens, i);
		if (r) {
			code = r.code;
			i = r.end;
		}
	}
	const text = tokens
		.slice(i)
		.filter((t) => t.type !== 'crlf')
		.map((t) => tokStr(t))
		.join(' ');
	return { kind: 'tagged', tag, status, code, text };
}
