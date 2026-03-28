import type { EmailDb } from '../database.ts';

export function createIndexes(db: EmailDb): void {
	db.exec(`
		CREATE INDEX IF NOT EXISTS idx_messages_folder ON messages(folder_id, uid);
		CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
		CREATE INDEX IF NOT EXISTS idx_messages_date ON messages("date" DESC);
		CREATE INDEX IF NOT EXISTS idx_messages_message_id ON messages(message_id);
		CREATE INDEX IF NOT EXISTS idx_messages_flags ON messages(folder_id, flags);
		CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments(message_id);
		CREATE INDEX IF NOT EXISTS idx_sync_log_folder ON sync_log(folder_id, synced_at);
	`);
}
