import type { Address } from './address.ts';
import type { AttachmentMeta } from './attachment.ts';
import type { BodyPart } from './body_part.ts';

export type Message = {
	id: number;
	folderId: number;
	uid: number;
	messageId: string | null;
	inReplyTo: string | null;
	references: string[];
	threadId: string | null;
	from: Address | null;
	to: Address[];
	cc: Address[];
	bcc: Address[];
	replyTo: Address | null;
	subject: string | null;
	date: string | null;
	receivedAt: string;
	envelopeFrom: Address | null;
	envelopeTo: Address[];
	flags: string[];
	labels: string[];
	size: number | null;
	bodyStructure: BodyPart | null;
	hasAttachments: boolean;
	modSeq: number | null;
};

export type MessageBody = {
	textPlain: string | null;
	textHtml: string | null;
	raw?: Buffer;
};

export type MessageDetail = Message & {
	textPlain: string | null;
	textHtml: string | null;
	attachments: AttachmentMeta[];
};

export type InsertMessageInput = Omit<Message, 'id'>;
