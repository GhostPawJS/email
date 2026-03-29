// TTY detection, ANSI color helpers, print utilities.
// No library imports — pure Node.js built-ins only.

export function isTTY(): boolean {
	return process.stdout.isTTY === true;
}

export function useColor(): boolean {
	return isTTY() && !process.env['NO_COLOR'] && process.env['TERM'] !== 'dumb';
}

function ansi(code: string, s: string): string {
	return useColor() ? `\x1b[${code}m${s}\x1b[0m` : s;
}

export function bold(s: string): string {
	return ansi('1', s);
}

export function dim(s: string): string {
	return ansi('2', s);
}

export function red(s: string): string {
	return ansi('31', s);
}

export function yellow(s: string): string {
	return ansi('33', s);
}

export function print(msg: string): void {
	process.stdout.write(msg + '\n');
}

export function printError(msg: string): void {
	process.stderr.write(msg + '\n');
}
