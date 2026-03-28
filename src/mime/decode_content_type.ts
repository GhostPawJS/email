/** Parse Content-Type / MIME type line. */
export function decodeContentType(raw: string): {
	type: string;
	subtype: string;
	params: Record<string, string>;
} {
	const s = raw.trim();
	const semi = s.indexOf(';');
	const main = semi >= 0 ? s.slice(0, semi).trim() : s;
	const rest = semi >= 0 ? s.slice(semi + 1) : '';
	const slash = main.indexOf('/');
	const type = slash >= 0 ? main.slice(0, slash).toLowerCase() : main.toLowerCase();
	const subtype = slash >= 0 ? main.slice(slash + 1).toLowerCase() : '';
	const params: Record<string, string> = {};
	let i = 0;
	const part = rest;
	while (i < part.length) {
		while (i < part.length && /[;\s]/.test(part[i] ?? '')) i++;
		const eq = part.indexOf('=', i);
		if (eq < 0) break;
		const key = part.slice(i, eq).trim().toLowerCase();
		let j = eq + 1;
		while (j < part.length && part[j] === ' ') j++;
		let val = '';
		if (part[j] === '"') {
			j++;
			while (j < part.length && part[j] !== '"') {
				if (part[j] === '\\') j++;
				val += part[j] ?? '';
				j++;
			}
			if (part[j] === '"') j++;
		} else {
			while (j < part.length && part[j] !== ';' && part[j] !== ' ') {
				val += part[j] ?? '';
				j++;
			}
		}
		params[key] = val;
		i = j;
	}
	const merged: Record<string, string> = { ...params };
	for (const [k, v] of Object.entries(params)) {
		const mm = k.match(/^(.+)\*0$/);
		if (mm) {
			const base = mm[1] ?? '';
			let acc = v;
			for (let n = 1; n < 20; n++) {
				const ck = `${base}*${n}`;
				if (params[ck]) acc += params[ck];
			}
			merged[base] = acc;
		}
	}
	const fnStar = Object.keys(merged).find((k) => k === 'filename*' || k.endsWith('filename*'));
	if (fnStar && merged[fnStar]) {
		const u = merged[fnStar];
		const m = u.match(/^([^']*)''(.*)$/);
		if (m) {
			try {
				merged.filename = decodeURIComponent(m[2] ?? '');
			} catch {
				merged.filename = m[2] ?? '';
			}
		}
	}
	return { type, subtype, params: merged };
}
