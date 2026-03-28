import type { EmailDb } from '../database.ts';

export function upsertBody(
	db: EmailDb,
	messageId: number,
	textPlain: string | null,
	textHtml: string | null,
	raw?: Buffer,
): void {
	db.prepare(
		`
			INSERT INTO bodies (message_id, text_plain, text_html, raw)
			VALUES (?, ?, ?, ?)
			ON CONFLICT(message_id) DO UPDATE SET
				text_plain = excluded.text_plain,
				text_html = excluded.text_html,
				raw = excluded.raw
		`,
	).run(messageId, textPlain, textHtml, raw ?? null);
}
