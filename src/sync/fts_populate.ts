import type { EmailDb } from '../database.ts';
import { htmlToText } from '../lib/html_to_text.ts';

export function populateFts(
	db: EmailDb,
	messageId: number,
	textPlain: string | null,
	textHtml: string | null,
): void {
	const bodyText = textPlain ?? (textHtml ? htmlToText(textHtml) : '');

	// Fetch current subject, sender, recipients from messages table
	const row = db
		.prepare('SELECT subject, "from", "to" FROM messages WHERE id = ?')
		.get(messageId) as Record<string, unknown> | undefined;
	if (!row) return;

	const subject = row.subject != null ? String(row.subject) : '';
	const sender = row.from != null ? String(row.from) : '';
	const recipients = row.to != null ? String(row.to) : '';

	// Delete old FTS row and insert new with body text
	db.exec(`DELETE FROM messages_fts WHERE rowid = ${messageId}`);
	db.prepare(
		'INSERT INTO messages_fts(rowid, subject, body_text, sender, recipients) VALUES (?, ?, ?, ?, ?)',
	).run(messageId, subject, bodyText, sender, recipients);
}
