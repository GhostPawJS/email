const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function encodeDate(date?: Date): string {
	const d = date ?? new Date();
	const wd = days[d.getUTCDay()] ?? 'Thu';
	const mon = months[d.getUTCMonth()] ?? 'Jan';
	const dd = String(d.getUTCDate()).padStart(2, '0');
	const y = d.getUTCFullYear();
	const hh = String(d.getUTCHours()).padStart(2, '0');
	const mm = String(d.getUTCMinutes()).padStart(2, '0');
	const ss = String(d.getUTCSeconds()).padStart(2, '0');
	return `${wd}, ${dd} ${mon} ${y} ${hh}:${mm}:${ss} +0000`;
}
