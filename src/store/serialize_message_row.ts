import type { InsertMessageInput } from '../types/message.ts';

export function messageToInsertParams(input: InsertMessageInput): {
	folderId: number;
	uid: number;
	messageId: string | null;
	inReplyTo: string | null;
	references: string;
	threadId: string | null;
	subject: string | null;
	from: string | null;
	to: string;
	cc: string;
	bcc: string;
	replyTo: string | null;
	date: string | null;
	receivedAt: string;
	envelopeFrom: string | null;
	envelopeTo: string;
	flags: string;
	labels: string;
	size: number | null;
	bodyStructure: string | null;
	hasAttachments: number;
	modSeq: number | null;
} {
	return {
		folderId: input.folderId,
		uid: input.uid,
		messageId: input.messageId,
		inReplyTo: input.inReplyTo,
		references: JSON.stringify(input.references),
		threadId: input.threadId,
		subject: input.subject,
		from: input.from ? JSON.stringify(input.from) : null,
		to: JSON.stringify(input.to),
		cc: JSON.stringify(input.cc),
		bcc: JSON.stringify(input.bcc),
		replyTo: input.replyTo ? JSON.stringify(input.replyTo) : null,
		date: input.date,
		receivedAt: input.receivedAt,
		envelopeFrom: input.envelopeFrom ? JSON.stringify(input.envelopeFrom) : null,
		envelopeTo: JSON.stringify(input.envelopeTo),
		flags: JSON.stringify(input.flags),
		labels: JSON.stringify(input.labels),
		size: input.size,
		bodyStructure: input.bodyStructure ? JSON.stringify(input.bodyStructure) : null,
		hasAttachments: input.hasAttachments ? 1 : 0,
		modSeq: input.modSeq,
	};
}
