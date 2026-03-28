const months: Record<string, number> = {
	Jan: 0,
	Feb: 1,
	Mar: 2,
	Apr: 3,
	May: 4,
	Jun: 5,
	Jul: 6,
	Aug: 7,
	Sep: 8,
	Oct: 9,
	Nov: 10,
	Dec: 11,
};

/** Parse common RFC 5322 Date header values to ISO 8601 (UTC). */
export function decodeDate(raw: string): string {
	const t = raw.trim();
	const m = t.match(
		/(?:[A-Za-z]{3},\s*)?(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([+-]\d{4}|GMT|UTC|[A-Z]{3})?/,
	);
	if (!m) {
		const d = new Date(t);
		return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
	}
	const day = Number(m[1]);
	const mon = months[m[2] ?? 'Jan'] ?? 0;
	const year = Number(m[3]);
	const hh = Number(m[4]);
	const mm = Number(m[5]);
	const ss = m[6] != null ? Number(m[6]) : 0;
	const tz = m[7] ?? '+0000';
	let offsetMin = 0;
	if (tz === 'GMT' || tz === 'UTC') {
		offsetMin = 0;
	} else if (/^[+-]\d{4}$/.test(tz)) {
		const sign = tz[0] === '-' ? -1 : 1;
		const oh = Number(tz.slice(1, 3));
		const om = Number(tz.slice(3, 5));
		offsetMin = sign * (oh * 60 + om);
	}
	const utcMs = Date.UTC(year, mon, day, hh, mm, ss) - offsetMin * 60 * 1000;
	return new Date(utcMs).toISOString();
}
