import { randomUUID } from 'node:crypto';

export function generateMessageId(domain: string): string {
	const id = randomUUID().replace(/-/g, '');
	return `<${Date.now()}.${id}@${domain}>`;
}

export function generateBoundary(): string {
	return `----=_Part_${randomUUID()}`;
}

export function generateTag(prefix: string, seq: number): string {
	return `${prefix}${String(seq).padStart(4, '0')}`;
}
