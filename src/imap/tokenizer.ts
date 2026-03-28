import type { ImapToken } from '../types/imap_response.ts';

type State =
	| { kind: 'idle' }
	| { kind: 'atom'; start: number }
	| { kind: 'quoted'; chars: number[]; escape: boolean }
	| { kind: 'literal_header'; chars: number[] }
	| { kind: 'literal_body'; buf: Buffer; remaining: number };

export class ImapTokenizer {
	#buf = Buffer.alloc(0);
	#pos = 0;
	#tokens: ImapToken[] = [];
	#state: State = { kind: 'idle' };

	feed(chunk: Buffer): void {
		this.#buf = Buffer.concat([this.#buf.subarray(this.#pos), chunk]);
		this.#pos = 0;
		this.#scan();
	}

	read(): ImapToken | null {
		return this.#tokens.shift() ?? null;
	}

	readAll(): ImapToken[] {
		const out = this.#tokens;
		this.#tokens = [];
		return out;
	}

	#emit(tok: ImapToken): void {
		this.#tokens.push(tok);
	}

	/** Flush a completed atom given the current buffer and position. */
	#flushAtom(buf: Buffer, start: number, end: number): void {
		const val = buf.subarray(start, end).toString('ascii');
		if (!val) return;
		if (val.toUpperCase() === 'NIL') {
			this.#emit({ type: 'nil', value: null });
		} else if (/^\d+$/.test(val)) {
			this.#emit({ type: 'number', value: Number.parseInt(val, 10) });
		} else {
			this.#emit({ type: 'atom', value: val });
		}
		this.#state = { kind: 'idle' };
	}

	#scan(): void {
		const buf = this.#buf;
		const len = buf.length;

		while (this.#pos < len) {
			const state = this.#state;

			if (state.kind === 'literal_body') {
				const avail = len - this.#pos;
				const take = Math.min(avail, state.remaining);
				state.buf = Buffer.concat([state.buf, buf.subarray(this.#pos, this.#pos + take)]);
				state.remaining -= take;
				this.#pos += take;
				if (state.remaining === 0) {
					this.#emit({ type: 'literal', value: state.buf });
					this.#state = { kind: 'idle' };
				}
				continue;
			}

			const ch = buf[this.#pos];
			if (ch === undefined) break;

			if (state.kind === 'quoted') {
				if (state.escape) {
					state.chars.push(ch);
					state.escape = false;
					this.#pos++;
					continue;
				}
				if (ch === 0x5c) {
					// backslash
					state.escape = true;
					this.#pos++;
					continue;
				}
				if (ch === 0x22) {
					// closing quote
					this.#emit({ type: 'quoted', value: Buffer.from(state.chars).toString('utf8') });
					this.#state = { kind: 'idle' };
					this.#pos++;
					continue;
				}
				state.chars.push(ch);
				this.#pos++;
				continue;
			}

			if (state.kind === 'literal_header') {
				if (ch === 0x7d) {
					// }
					const s = Buffer.from(state.chars).toString('ascii');
					const nonSync = s.endsWith('+');
					const n = Number.parseInt(nonSync ? s.slice(0, -1) : s, 10);
					this.#state = { kind: 'literal_body', buf: Buffer.alloc(0), remaining: n };
					// skip } and the CRLF that follows
					this.#pos++;
					// skip \r\n
					if (this.#pos < len && buf[this.#pos] === 0x0d) this.#pos++;
					if (this.#pos < len && buf[this.#pos] === 0x0a) this.#pos++;
					continue;
				}
				state.chars.push(ch);
				this.#pos++;
				continue;
			}

			if (state.kind === 'atom') {
				if (isAtomChar(ch)) {
					this.#pos++;
					continue;
				}
				// flush atom
				this.#flushAtom(buf, state.start, this.#pos);
				continue; // reprocess this char as idle
			}

			// idle
			if (ch === 0x20 || ch === 0x09) {
				// space/tab
				this.#pos++;
				continue;
			}
			if (ch === 0x0d) {
				// CR
				if (this.#pos + 1 < len && buf[this.#pos + 1] === 0x0a) {
					this.#emit({ type: 'crlf', value: '\r\n' });
					this.#pos += 2;
				} else {
					this.#pos++;
				}
				continue;
			}
			if (ch === 0x0a) {
				this.#emit({ type: 'crlf', value: '\r\n' });
				this.#pos++;
				continue;
			}
			if (ch === 0x28) {
				this.#emit({ type: 'lparen', value: '(' });
				this.#pos++;
				continue;
			}
			if (ch === 0x29) {
				this.#emit({ type: 'rparen', value: ')' });
				this.#pos++;
				continue;
			}
			if (ch === 0x5b) {
				this.#emit({ type: 'lbracket', value: '[' });
				this.#pos++;
				continue;
			}
			if (ch === 0x5d) {
				this.#emit({ type: 'rbracket', value: ']' });
				this.#pos++;
				continue;
			}
			if (ch === 0x2b) {
				this.#emit({ type: 'plus', value: '+' });
				this.#pos++;
				continue;
			}
			if (ch === 0x2a) {
				this.#emit({ type: 'star', value: '*' });
				this.#pos++;
				continue;
			}
			if (ch === 0x22) {
				this.#state = { kind: 'quoted', chars: [], escape: false };
				this.#pos++;
				continue;
			}
			if (ch === 0x7b) {
				this.#state = { kind: 'literal_header', chars: [] };
				this.#pos++;
				continue;
			}
			// atom start
			this.#state = { kind: 'atom', start: this.#pos };
			this.#pos++;
		}

		// compact buffer — preserve pending atom text
		if (this.#state.kind === 'atom') {
			const atomStart = this.#state.start;
			this.#buf = buf.subarray(atomStart);
			this.#state = { kind: 'atom', start: 0 };
		} else {
			this.#buf = buf.subarray(this.#pos);
		}
		this.#pos = 0;
	}
}

function isAtomChar(ch: number): boolean {
	if (ch <= 0x20 || ch === 0x7f) return false;
	if (ch === 0x28 || ch === 0x29 || ch === 0x7b || ch === 0x5b || ch === 0x5d || ch === 0x22)
		return false;
	return true;
}
