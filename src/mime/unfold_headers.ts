/** RFC 5322 header unfolding: CRLF + WSP continues previous line. */
export function unfoldHeaders(raw: string): string {
	return raw.replace(/\r?\n[ \t]+/g, ' ');
}
