import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseMultipart } from './parse_multipart.ts';

describe('parseMultipart', () => {
	it('splits parts by boundary', () => {
		const body = Buffer.from(
			'--boundary\r\nContent-Type: text/plain\r\n\r\nhello\r\n--boundary\r\nContent-Type: text/html\r\n\r\n<b>hi</b>\r\n--boundary--\r\n',
		);
		const parts = parseMultipart(body, 'boundary');
		assert.equal(parts.length, 2);
		assert.ok(parts[0]?.body.toString().includes('hello'));
		assert.ok(parts[1]?.body.toString().includes('<b>hi</b>'));
	});

	it('returns empty array for missing boundary', () => {
		const parts = parseMultipart(Buffer.from('no boundary here'), 'notpresent');
		assert.equal(parts.length, 0);
	});
});
