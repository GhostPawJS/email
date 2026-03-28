export function dotStuff(data: string): string {
	return data
		.split('\r\n')
		.map((line) => (line.startsWith('.') ? `.${line}` : line))
		.join('\r\n');
}

export function dotUnstuff(data: string): string {
	return data
		.split('\r\n')
		.map((line) => (line.startsWith('..') ? line.slice(1) : line))
		.join('\r\n');
}
