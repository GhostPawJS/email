// Stdin piping detection and async reading.
// No library imports — pure Node.js built-ins only.

export function isStdinPiped(): boolean {
	return process.stdin.isTTY !== true;
}

export async function readStdin(stream: NodeJS.ReadableStream = process.stdin): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string, 'utf-8'));
	}
	return Buffer.concat(chunks).toString('utf-8');
}
