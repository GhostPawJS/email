/** Chars that require quoting or literal encoding in IMAP arguments. */
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally matching NUL and control chars
const SPECIAL = /["\\\x00-\x1f\x7f]/;

export function encodeArg(arg: string): string {
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

export function buildCommand(tag: string, name: string, args?: string[]): string {
	const parts = [tag, name];
	if (args?.length) {
		for (const a of args) parts.push(encodeArg(a));
	}
	return `${parts.join(' ')}\r\n`;
}
