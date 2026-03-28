const ENTITY_MAP: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
};

export function htmlToText(html: string): string {
	let s = html;
	s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
	s = s.replace(/<style[\s\S]*?<\/style>/gi, '');
	s = s.replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, '\n');
	s = s.replace(/<br\s*\/?>/gi, '\n');
	s = s.replace(/<[^>]+>/g, '');
	s = s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, ent) => {
		if (ent[0] === '#') {
			const code =
				ent[1] === 'x' ? Number.parseInt(ent.slice(2), 16) : Number.parseInt(ent.slice(1), 10);
			return Number.isFinite(code) ? String.fromCodePoint(code) : m;
		}
		return ENTITY_MAP[ent] ?? m;
	});
	return s
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}
