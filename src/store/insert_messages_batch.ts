import type { EmailDb } from '../database.ts';
import type { InsertMessageInput } from '../types/message.ts';
import { messageToInsertParams } from './serialize_message_row.ts';

/**
 * Batch-insert messages using INSERT OR IGNORE so that duplicates
 * (same folder_id + uid) are silently skipped. This makes sync
 * idempotent: running initialSync twice on the same folder won't crash.
 */
export function insertMessagesBatch(db: EmailDb, inputs: InsertMessageInput[]): void {
	if (inputs.length === 0) return;
	const stmt = db.prepare(
		`
			INSERT OR IGNORE INTO messages (
				folder_id, uid, message_id, in_reply_to, "references", thread_id,
				subject, "from", "to", cc, bcc, reply_to,
				"date", received_at, envelope_from, envelope_to,
				flags, labels, size, body_structure, has_attachments, mod_seq
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
	);
	db.exec('BEGIN');
	try {
		for (const input of inputs) {
			const p = messageToInsertParams(input);
			stmt.run(
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
		}
		db.exec('COMMIT');
	} catch (e) {
		db.exec('ROLLBACK');
		throw e;
	}
}
