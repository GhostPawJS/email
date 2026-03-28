import type { EmailDb } from '../database.ts';
import type { InsertMessageInput, Message } from '../types/message.ts';
import { deserializeMessageRow } from './deserialize_message.ts';
import { messageToInsertParams } from './serialize_message_row.ts';

export function insertMessage(db: EmailDb, input: InsertMessageInput): Message {
	const p = messageToInsertParams(input);
	const result = db
		.prepare(
			`
				INSERT INTO messages (
					folder_id, uid, message_id, in_reply_to, "references", thread_id,
					subject, "from", "to", cc, bcc, reply_to,
					"date", received_at, envelope_from, envelope_to,
					flags, labels, size, body_structure, has_attachments, mod_seq
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`,
		)
		.run(
			p.folderId,
			p.uid,
			p.messageId,
			p.inReplyTo,
			p.references,
			p.threadId,
			p.subject,
			p.from,
			p.to,
			p.cc,
			p.bcc,
			p.replyTo,
			p.date,
			p.receivedAt,
			p.envelopeFrom,
			p.envelopeTo,
			p.flags,
			p.labels,
			p.size,
			p.bodyStructure,
			p.hasAttachments,
			p.modSeq,
		);
	const id = Number(result.lastInsertRowid);
	const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as Record<string, unknown>;
	return deserializeMessageRow(row);
}
