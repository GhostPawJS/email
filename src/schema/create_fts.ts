import type { EmailDb } from '../database.ts';

export function createFts(db: EmailDb): void {
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

		CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
			DELETE FROM messages_fts WHERE rowid = old.id;
			INSERT INTO messages_fts(rowid, subject, body_text, sender, recipients)
			VALUES (new.id, new.subject, '', new."from", new."to");
		END;
	`);
}
