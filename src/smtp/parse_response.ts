import type { SmtpErrorCategory, SmtpResponse } from '../types/smtp.ts';

export function parseSmtpResponse(lines: string[]): SmtpResponse {
	if (!lines.length) {
		return { code: 0, enhanced: null, message: '', isMultiline: false };
	}
	const last = lines[lines.length - 1] ?? '';
	const codeStr = last.slice(0, 3);
	const code = Number.parseInt(codeStr, 10);
	const isMultiline = lines.length > 1;

	// Extract enhanced status code (e.g. 2.1.0)
	const enhanced = last.match(/^\d{3}[ -](\d\.\d\.\d+)/)?.[1] ?? null;

	// Collect message text (without codes), preserve lines with \n separator
	const message = lines
		.map((l) => l.slice(4).trim())
		.filter(Boolean)
		.join('\n');

	return { code, enhanced, message, isMultiline };
}

export function categorizeSmtpError(code: number): SmtpErrorCategory {
	if (code >= 200 && code < 300) return 'success';
	if (code >= 400 && code < 500) return 'temporary';
	return 'permanent';
}
