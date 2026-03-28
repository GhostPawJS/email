import type { EmailDb } from '../database.ts';

export function createTables(db: EmailDb): void {
	db.exec(`
		PRAGMA foreign_keys = ON;

		CREATE TABLE IF NOT EXISTS accounts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			host TEXT NOT NULL,
			port INTEGER NOT NULL,
			username TEXT NOT NULL,
			label TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS folders (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
			path TEXT NOT NULL,
			delimiter TEXT NOT NULL DEFAULT '/',
			role TEXT,
			uid_validity INTEGER,
			uid_next INTEGER,
			highest_mod_seq INTEGER,
			message_count INTEGER,
			unseen_count INTEGER,
			last_synced_at TEXT,
			UNIQUE(account_id, path)
		);

		CREATE TABLE IF NOT EXISTS messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
			uid INTEGER NOT NULL,
			message_id TEXT,
			in_reply_to TEXT,
			"references" TEXT,
			thread_id TEXT,
			subject TEXT,
			"from" TEXT,
			"to" TEXT,
			cc TEXT,
			bcc TEXT,
			reply_to TEXT,
			envelope_from TEXT,
			envelope_to TEXT,
			"date" TEXT,
			received_at TEXT NOT NULL DEFAULT (datetime('now')),
			flags TEXT NOT NULL DEFAULT '[]',
			labels TEXT NOT NULL DEFAULT '[]',
			size INTEGER,
			body_structure TEXT,
			has_attachments INTEGER NOT NULL DEFAULT 0,
			mod_seq INTEGER,
			UNIQUE(folder_id, uid)
		);

		CREATE TABLE IF NOT EXISTS bodies (
			message_id INTEGER PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
			text_plain TEXT,
			text_html TEXT,
			raw BLOB
		);

		CREATE TABLE IF NOT EXISTS attachments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
			filename TEXT,
			mime_type TEXT,
			size INTEGER,
			content_id TEXT,
			part_path TEXT NOT NULL,
			inline_flag INTEGER NOT NULL DEFAULT 0,
			data BLOB
		);

		CREATE TABLE IF NOT EXISTS sync_log (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
			action TEXT NOT NULL,
			uid INTEGER NOT NULL,
			details TEXT,
			synced_at TEXT NOT NULL DEFAULT (datetime('now'))
		);
	`);
}
