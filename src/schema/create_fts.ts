import type { EmailDb } from '../database.ts';

export function createFts(db: EmailDb): void {
	// Replace the legacy update trigger when opening existing caches.
	db.exec(`
		CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
			subject,
			body_text,
			sender,
			recipients,
			tokenize='porter unicode61 remove_diacritics 2'
		);

		CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
			INSERT INTO messages_fts(rowid, subject, body_text, sender, recipients)
			VALUES (new.id, new.subject, '', new."from", new."to");
		END;

		CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
			DELETE FROM messages_fts WHERE rowid = old.id;
		END;

		DROP TRIGGER IF EXISTS messages_au;

		CREATE TRIGGER messages_au AFTER UPDATE ON messages BEGIN
			UPDATE messages_fts SET subject = new.subject, sender = new."from", recipients = new."to"
			WHERE rowid = old.id;
		END;
	`);
}
