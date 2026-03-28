import { encodeBase64Lines } from '../lib/base64.ts';
import type { ComposeAttachment } from '../types/compose.ts';

export function encodeAttachment(att: ComposeAttachment): string {
	const mime = att.mimeType ?? 'application/octet-stream';
	const cd = att.inline ? 'inline' : 'attachment';
	const lines: string[] = [];
	lines.push(`Content-Type: ${mime}; name="${att.filename.replace(/"/g, '')}"`);
	lines.push(`Content-Disposition: ${cd}; filename="${att.filename.replace(/"/g, '')}"`);
	if (att.inline && att.contentId) {
		lines.push(`Content-ID: <${att.contentId}>`);
	}
	lines.push('Content-Transfer-Encoding: base64');
	lines.push('');
	lines.push(encodeBase64Lines(att.content));
	return lines.join('\r\n');
}
