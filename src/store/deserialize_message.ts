import type { Address } from '../types/address.ts';
import type { BodyPart } from '../types/body_part.ts';
import type { Message } from '../types/message.ts';

function parseJson<T>(raw: string | null, fallback: T): T {
	if (raw === null || raw === '') return fallback;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

/** Maps a SQLite messages row (snake_case columns) to a typed Message. */
export function deserializeMessageRow(row: Record<string, unknown>): Message {
	const id = Number(row.id);
	const folderId = Number(row.folder_id);
	const uid = Number(row.uid);
	return {
		id,
		folderId,
		uid,
		messageId: row.message_id != null ? String(row.message_id) : null,
		inReplyTo: row.in_reply_to != null ? String(row.in_reply_to) : null,
		references: parseJson<string[]>(row.references as string | null, []),
		threadId: row.thread_id != null ? String(row.thread_id) : null,
		from: parseJson<Address | null>(row.from as string | null, null),
		to: parseJson<Address[]>(row.to as string | null, []),
		cc: parseJson<Address[]>(row.cc as string | null, []),
		bcc: parseJson<Address[]>(row.bcc as string | null, []),
		replyTo: parseJson<Address | null>(row.reply_to as string | null, null),
		subject: row.subject != null ? String(row.subject) : null,
		date: row.date != null ? String(row.date) : null,
		receivedAt: String(row.received_at ?? ''),
		envelopeFrom: parseJson<Address | null>(row.envelope_from as string | null, null),
		envelopeTo: parseJson<Address[]>(row.envelope_to as string | null, []),
		flags: parseJson<string[]>(row.flags as string | null, []),
		labels: parseJson<string[]>(row.labels as string | null, []),
		size: row.size != null ? Number(row.size) : null,
		bodyStructure: parseJson<BodyPart | null>(row.body_structure as string | null, null),
		hasAttachments: Number(row.has_attachments ?? 0) !== 0,
		modSeq: row.mod_seq != null ? Number(row.mod_seq) : null,
	};
}
