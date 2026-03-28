export type AttachmentMeta = {
	id: number;
	messageId: number;
	filename: string | null;
	mimeType: string | null;
	size: number | null;
	contentId: string | null;
	partPath: string;
	inline: boolean;
};

export type Attachment = AttachmentMeta & {
	data: Buffer;
};
