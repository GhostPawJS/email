import type { NegotiatedExtensions } from '../types/capability.ts';

export function parseCapabilities(response: string): Set<string> {
	const caps = new Set<string>();
	// Handle both "* CAPABILITY ..." and "[CAPABILITY ...]" forms
	const match = response.match(/CAPABILITY\s+(.+?)(?:\]|$)/i);
	const raw = match ? match[1] : response;
	if (!raw) return caps;
	for (const atom of raw.trim().split(/\s+/)) {
		if (atom) caps.add(atom.toUpperCase());
	}
	return caps;
}

export function negotiateExtensions(capabilities: Set<string>): NegotiatedExtensions {
	return {
		condstore: capabilities.has('CONDSTORE'),
		qresync: capabilities.has('QRESYNC'),
		move: capabilities.has('MOVE'),
		uidplus: capabilities.has('UIDPLUS'),
		compress: capabilities.has('COMPRESS=DEFLATE'),
		idle: capabilities.has('IDLE'),
		sort: capabilities.has('SORT'),
		thread: capabilities.has('THREAD=REFERENCES') || capabilities.has('THREAD=ORDEREDSUBJECT'),
		specialUse: capabilities.has('SPECIAL-USE'),
		namespace: capabilities.has('NAMESPACE'),
		id: capabilities.has('ID'),
		quota: capabilities.has('QUOTA'),
		literalPlus: capabilities.has('LITERAL+') || capabilities.has('LITERAL-'),
		esearch: capabilities.has('ESEARCH'),
		listStatus: capabilities.has('LIST-STATUS'),
		binary: capabilities.has('BINARY'),
		unselect: capabilities.has('UNSELECT'),
		appendLimit: [...capabilities].reduce<number | null>((acc, c) => {
			const m = c.match(/^APPENDLIMIT=(\d+)$/);
			return m ? Number(m[1]) : acc;
		}, null),
	};
}
