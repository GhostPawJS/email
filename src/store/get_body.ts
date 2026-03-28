import type { EmailDb } from '../database.ts';
import type { MessageBody } from '../types/message.ts';

export function getBody(db: EmailDb, messageId: number): MessageBody | undefined {
	const row = db
		.prepare('SELECT text_plain, text_html, raw FROM bodies WHERE message_id = ?')
		.get(messageId) as
		| {
				text_plain: string | null;
				text_html: string | null;
				raw: Buffer | null;
		  }
		| undefined;
	if (!row) return undefined;
	const body: MessageBody = {
		textPlain: row.text_plain,
		textHtml: row.text_html,
	};
	if (row.raw != null && Buffer.isBuffer(row.raw)) {
		body.raw = row.raw;
	}
	return body;
}
