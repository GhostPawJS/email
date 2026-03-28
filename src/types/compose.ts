import type { Address } from './address.ts';

export type ComposeAttachment = {
	filename: string;
	content: Buffer;
	mimeType?: string;
	inline?: boolean;
	contentId?: string;
};

export type ComposeInput = {
	from?: Address;
	to: Address[];
	cc?: Address[];
	bcc?: Address[];
	sender?: Address;
	envelopeFrom?: Address;
	replyTo?: Address;
	subject: string;
	text?: string;
	html?: string;
	attachments?: ComposeAttachment[];
	inReplyTo?: string;
	references?: string[];
	headers?: Record<string, string>;
};

export type ReplyInput = {
	to?: Address[];
	cc?: Address[];
	bcc?: Address[];
	text?: string;
	html?: string;
	attachments?: ComposeAttachment[];
	replyAll?: boolean;
};

export type ForwardInput = {
	to: Address[];
	cc?: Address[];
	bcc?: Address[];
	text?: string;
	html?: string;
	attachments?: ComposeAttachment[];
	mode?: 'inline' | 'attachment';
};
