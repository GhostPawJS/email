import type { EmailDb } from '../database.ts';
import type { Attachment } from '../types/attachment.ts';

export function getAttachmentData(db: EmailDb, attachmentId: number): Attachment | undefined {
	const row = db
		.prepare(
			`
				SELECT id, message_id, filename, mime_type, size, content_id, part_path, inline_flag, data
				FROM attachments WHERE id = ?
			`,
		)
		.get(attachmentId) as Record<string, unknown> | undefined;
	if (!row) return undefined;
	const data = row.data;
	return {
		id: Number(row.id),
		messageId: Number(row.message_id),
		filename: row.filename != null ? String(row.filename) : null,
		mimeType: row.mime_type != null ? String(row.mime_type) : null,
		size: row.size != null ? Number(row.size) : null,
		contentId: row.content_id != null ? String(row.content_id) : null,
		partPath: String(row.part_path),
		inline: Number(row.inline_flag) !== 0,
		data: data != null ? Buffer.from(data as Uint8Array | Buffer) : Buffer.alloc(0),
	};
}
