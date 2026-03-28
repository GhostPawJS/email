/** Chars that require quoting or literal encoding in IMAP arguments. */
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally matching NUL and control chars
const SPECIAL = /["\\\x00-\x1f\x7f]/;

/**
 * A raw IMAP argument that bypasses encodeArg quoting.
 * Use for sequence sets (1:*), parenthesised lists ((FLAGS BODY)),
 * flag lists (\Seen), SEARCH queries, and other pre-formatted IMAP syntax.
 */
export type RawArg = { readonly __raw: string };

/** Mark a pre-formatted IMAP token as raw — it will not be quoted. */
export function raw(s: string): RawArg {
	return { __raw: s };
}

/**
 * Encode a single IMAP argument for wire transmission.
 *
 * - Empty string → `""` (IMAP requires a quoted empty string, not a bare atom)
 * - Safe atoms (no specials/whitespace) → passed through unchanged
 * - Strings with spaces/brackets/specials → quoted, with internal `\` and `"` escaped
 * - Strings with embedded CRLF or NUL → literal `{N}\r\n<bytes>`
 *
 * For pre-formatted IMAP syntax (sequence sets, parenthesized lists, flag names),
 * use `raw()` instead — those must NOT be quoted.
 */
export function encodeArg(arg: string): string {
	if (arg === '') return '""';
	if (!SPECIAL.test(arg) && !/[\s(){}[\]*%\\]/.test(arg)) {
		return arg;
	}
	// Use quoted string if no embedded CRLF or NUL
	if (!arg.includes('\r') && !arg.includes('\n') && !arg.includes('\x00')) {
		return `"${arg.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
	}
	// Fall back to literal
	const bytes = Buffer.from(arg, 'utf8');
	return `{${bytes.length}}\r\n${arg}`;
}

function encodeOneArg(a: string | RawArg): string {
	return typeof a === 'string' ? encodeArg(a) : a.__raw;
}

export function buildCommand(tag: string, name: string, args?: (string | RawArg)[]): string {
	const parts = [tag, name];
	if (args?.length) {
		for (const a of args) parts.push(encodeOneArg(a));
	}
	return `${parts.join(' ')}\r\n`;
}

/** Encode a list of args into a space-separated string (no tag/name prefix). */
export function encodeArgs(args: (string | RawArg)[]): string {
	return args.map(encodeOneArg).join(' ');
}
