import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Attachment, AttachmentMeta } from './attachment.ts';

describe('Attachment', () => {
	it('Attachment extends AttachmentMeta with data', () => {
		const meta: AttachmentMeta = {
			id: 1,
			messageId: 2,
			filename: 'f.pdf',
			mimeType: 'application/pdf',
			size: 100,
			contentId: null,
			partPath: '2',
			inline: false,
		};
		const full: Attachment = { ...meta, data: Buffer.from('x') };
		assert.equal(full.data.length, 1);
		assert.equal(full.filename, 'f.pdf');
	});
});
