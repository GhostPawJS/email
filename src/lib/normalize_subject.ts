const PREFIXES = /^(re|fwd|fw)\s*:\s*/i;

export function normalizeSubject(subject: string): string {
	let s = subject.trim();
	for (;;) {
		const next = s.replace(PREFIXES, '').trim();
		const bracket = /^\[[^\]]+\]\s*/.exec(s);
		if (bracket) {
			s = s.slice(bracket[0].length).trim();
			continue;
		}
		if (next === s) break;
		s = next;
	}
	return s.trim();
}
