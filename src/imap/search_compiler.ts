import { EmailUnsupportedError } from '../errors.ts';
import type { SearchQuery } from '../types/search.ts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function imapDate(d: Date): string {
	const day = String(d.getUTCDate()).padStart(2, '0');
	const mon = MONTHS[d.getUTCMonth()] ?? 'Jan';
	const yr = d.getUTCFullYear();
	return `${day}-${mon}-${yr}`;
}

function compileOne(query: SearchQuery, caps: Set<string>): string {
	const parts: string[] = [];

	if (query.all) parts.push('ALL');
	if (query.unseen) parts.push('UNSEEN');
	if (query.seen) parts.push('SEEN');
	if (query.flagged) parts.push('FLAGGED');
	if (query.answered) parts.push('ANSWERED');
	if (query.deleted) parts.push('DELETED');
	if (query.draft) parts.push('DRAFT');
	if (query.since) parts.push(`SINCE ${imapDate(query.since)}`);
	if (query.before) parts.push(`BEFORE ${imapDate(query.before)}`);
	if (query.on) parts.push(`ON ${imapDate(query.on)}`);
	if (query.from) parts.push(`FROM "${query.from}"`);
	if (query.to) parts.push(`TO "${query.to}"`);
	if (query.cc) parts.push(`CC "${query.cc}"`);
	if (query.subject) parts.push(`SUBJECT "${query.subject}"`);
	if (query.body) parts.push(`BODY "${query.body}"`);
	if (query.text) parts.push(`TEXT "${query.text}"`);
	if (query.header) parts.push(`HEADER "${query.header.name}" "${query.header.value}"`);
	if (query.larger) parts.push(`LARGER ${query.larger}`);
	if (query.smaller) parts.push(`SMALLER ${query.smaller}`);
	if (query.uid) parts.push(`UID ${query.uid}`);
	if (query.modseq) parts.push(`MODSEQ ${query.modseq}`);
	if (query.gmailRaw !== undefined) {
		if (!caps.has('X-GM-EXT-1')) {
			throw new EmailUnsupportedError('gmailRaw', 'gmailRaw requires Gmail X-GM-EXT-1 capability');
		}
		parts.push(`X-GM-RAW "${query.gmailRaw}"`);
	}
	if (query.or) {
		const [a, b] = query.or;
		if (a && b) {
			parts.push(`OR ${compileOne(a, caps)} ${compileOne(b, caps)}`);
		}
	}
	if (query.not) {
		parts.push(`NOT ${compileOne(query.not, caps)}`);
	}

	return parts.join(' ') || 'ALL';
}

export function compileSearchQuery(query: SearchQuery, capabilities?: Set<string>): string {
	return compileOne(query, capabilities ?? new Set());
}
