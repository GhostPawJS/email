/** Parse Content-Disposition header. */
export function decodeContentDisposition(raw: string): {
	type: string;
	params: Record<string, string>;
} {
	const s = raw.trim();
	const semi = s.indexOf(';');
	const dtype = semi >= 0 ? s.slice(0, semi).trim().toLowerCase() : s.toLowerCase();
	const rest = semi >= 0 ? s.slice(semi + 1) : '';
	const params: Record<string, string> = {};
	let i = 0;
	while (i < rest.length) {
		while (i < rest.length && /[;\s]/.test(rest[i] ?? '')) i++;
		const eq = rest.indexOf('=', i);
		if (eq < 0) break;
		const key = rest.slice(i, eq).trim().toLowerCase();
		let j = eq + 1;
		while (j < rest.length && rest[j] === ' ') j++;
		let val = '';
		if (rest[j] === '"') {
			j++;
			while (j < rest.length && rest[j] !== '"') {
				if (rest[j] === '\\') j++;
				val += rest[j] ?? '';
				j++;
			}
			if (rest[j] === '"') j++;
		} else {
			while (j < rest.length && rest[j] !== ';' && rest[j] !== ' ') {
				val += rest[j] ?? '';
				j++;
			}
		}
		params[key] = val;
		i = j;
	}
	return { type: dtype, params };
}
