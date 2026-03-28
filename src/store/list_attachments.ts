import type { EmailDb } from '../database.ts';
import type { AttachmentMeta } from '../types/attachment.ts';

export function listAttachments(db: EmailDb, messageId: number): AttachmentMeta[] {
	const rows = db
		.prepare(
			`
				SELECT id, message_id, filename, mime_type, size, content_id, part_path, inline_flag
				FROM attachments WHERE message_id = ?
			`,
		)
		.all(messageId) as Record<string, unknown>[];
	return rows.map((row) => ({
		id: Number(row.id),
		messageId: Number(row.message_id),
		filename: row.filename != null ? String(row.filename) : null,
		mimeType: row.mime_type != null ? String(row.mime_type) : null,
		size: row.size != null ? Number(row.size) : null,
		contentId: row.content_id != null ? String(row.content_id) : null,
		partPath: String(row.part_path),
		inline: Number(row.inline_flag) !== 0,
	}));
}
