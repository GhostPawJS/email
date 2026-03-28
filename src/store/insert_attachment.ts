import type { EmailDb } from '../database.ts';
import type { AttachmentMeta } from '../types/attachment.ts';

export type InsertAttachmentInput = {
	messageId: number;
	filename?: string | null;
	mimeType?: string | null;
	size?: number | null;
	contentId?: string | null;
	partPath: string;
	inline: boolean;
	data?: Buffer | null;
};

export function insertAttachment(db: EmailDb, input: InsertAttachmentInput): AttachmentMeta {
	const result = db
		.prepare(
			`
				INSERT INTO attachments (
					message_id, filename, mime_type, size, content_id, part_path, inline_flag, data
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			`,
		)
		.run(
			input.messageId,
			input.filename ?? null,
			input.mimeType ?? null,
			input.size ?? null,
			input.contentId ?? null,
			input.partPath,
			input.inline ? 1 : 0,
			input.data ?? null,
		);
	const id = Number(result.lastInsertRowid);
	return {
		id,
		messageId: input.messageId,
		filename: input.filename ?? null,
		mimeType: input.mimeType ?? null,
		size: input.size ?? null,
		contentId: input.contentId ?? null,
		partPath: input.partPath,
		inline: input.inline,
	};
}
