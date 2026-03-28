import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractAttachments } from './extract_attachments.ts';
import { parseMultipart } from './parse_multipart.ts';

describe('extractAttachments', () => {
	it('detects attachment disposition parts', () => {
		const body = Buffer.from(
			'--b\r\nContent-Type: application/pdf\r\nContent-Disposition: attachment; filename="report.pdf"\r\n\r\npdfdata\r\n--b--\r\n',
		);
		const parts = parseMultipart(body, 'b');
		const attachments = extractAttachments(parts);
		assert.equal(attachments.length, 1);
		assert.equal(attachments[0]?.filename, 'report.pdf');
	});

	it('returns empty array when no attachments', () => {
		const body = Buffer.from('--b\r\nContent-Type: text/plain\r\n\r\nhello\r\n--b--\r\n');
		const parts = parseMultipart(body, 'b');
		assert.equal(extractAttachments(parts).length, 0);
	});
});
