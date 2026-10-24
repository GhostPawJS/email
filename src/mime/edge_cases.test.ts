import assert from 'node:assert/strict';
import test from 'node:test';
import { htmlToText } from '../lib/html_to_text.ts';
import { decodeQP, encodeQP } from '../lib/quoted_printable.ts';
import { decodeAddress, decodeAddressList } from './decode_address.ts';
import { decodeBodyStructure } from './decode_bodystructure.ts';
import { decodeContentDisposition } from './decode_content_disposition.ts';
import { decodeContentType } from './decode_content_type.ts';
import { decodeDate } from './decode_date.ts';
import { decodeTransferEncoding } from './decode_transfer_encoding.ts';
import { parseMultipart } from './parse_multipart.ts';
import { parseStructuredHeaders } from './parse_structured_headers.ts';

test('decodes quoted, encoded and bare address forms', () => {
	assert.deepEqual(decodeAddress('"A\\" B" <a@b>'), { name: 'A" B', address: 'a@b' });
	assert.deepEqual(decodeAddress('=?UTF-8?Q?Alice?= <a@b>'), { name: 'Alice', address: 'a@b' });
	assert.deepEqual(decodeAddress('<a@b>'), { address: 'a@b' });
	assert.deepEqual(decodeAddress('"" <a@b>'), { address: 'a@b' });
	assert.equal(decodeAddress('invalid'), null);
	assert.deepEqual(decodeAddressList('"A, B" <a@b>, <c@d>, invalid,'), [
		{ name: 'A, B', address: 'a@b' },
		{ address: 'c@d' },
	]);
	assert.deepEqual(decodeAddressList('undisclosed-recipients:;'), []);
});

test('structured headers preserve optional address and reference fields', () => {
	const headers = new Map(
		Object.entries({
			from: ['a@b'],
			to: ['c@d'],
			cc: ['e@f'],
			bcc: ['g@h'],
			'reply-to': ['r@b'],
			subject: ['subject'],
			date: ['1 Jan 2026 00:00:00 +0000'],
			'message-id': ['<id>'],
			'in-reply-to': ['<parent>'],
			references: ['<one> <two>'],
			'content-type': ['text/plain'],
			'content-disposition': ['inline'],
			'content-transfer-encoding': [' BASE64 '],
		}),
	);
	const result = parseStructuredHeaders(headers);
	assert.equal(result.replyTo?.address, 'r@b');
	assert.equal(result.cc[0]?.address, 'e@f');
	assert.equal(result.bcc[0]?.address, 'g@h');
	assert.deepEqual(result.references, ['one', 'two']);
	assert.equal(result.messageId, 'id');
	assert.equal(result.inReplyTo, 'parent');
	assert.equal(result.contentTransferEncoding, 'base64');
	assert.equal(result.contentDisposition?.type, 'inline');
	assert.equal(result.date, '2026-01-01T00:00:00.000Z');
	assert.equal(
		parseStructuredHeaders(
			new Map([
				['message-id', ['bare']],
				['in-reply-to', ['parent']],
			]),
		).messageId,
		'bare',
	);
	assert.equal(parseStructuredHeaders(new Map()).subject, null);
});

test('body structures tolerate missing fields and decode dispositions and nesting limits', () => {
	for (const disposition of [
		null,
		'invalid',
		[],
		['attachment', ['filename', 'a.txt', '', 'ignored']],
	]) {
		const part = decodeBodyStructure([
			'APPLICATION',
			'OCTET-STREAM',
			['NAME', 'a.txt', '', 'ignored'],
			'<id>',
			'description',
			'BASE64',
			'12',
			null,
			disposition,
		]);
		assert.equal(part.size, 12);
		assert.equal(part.params.name, 'a.txt');
		if (Array.isArray(disposition) && disposition.length)
			assert.equal(part.disposition?.params.filename, 'a.txt');
		else assert.equal(part.disposition, undefined);
	}
	assert.equal(
		decodeBodyStructure(['TEXT', 'PLAIN', null, null, null, null, 'bad', 'bad']).size,
		0,
	);
	const leaf = ['TEXT', 'PLAIN', null, null, null, '7BIT', 1, 1];
	const nested = decodeBodyStructure([[leaf, 'MIXED'], 'MIXED'], 0);
	assert.equal(nested.children?.[0]?.type, 'text');
	assert.equal(decodeBodyStructure([]).subtype, 'plain');
});

test('multipart handles nesting, LF delimiters, missing separators and absent closing boundary', () => {
	assert.deepEqual(parseMultipart(Buffer.from('nothing'), 'b'), []);
	assert.deepEqual(parseMultipart(Buffer.from('--b\r\ninvalid\r\n--b--'), 'b'), []);
	assert.deepEqual(parseMultipart(Buffer.from('--b--'), 'b', 1, 0), []);
	assert.equal(
		parseMultipart(Buffer.from('--b\nX: y\r\n\r\nbody'), 'b')[0]?.body.toString(),
		'body',
	);
	const nested = parseMultipart(
		Buffer.from(
			'--b\r\nContent-Type: multipart/mixed; boundary=c\r\n\r\n--c\r\nContent-Type: text/plain\r\n\r\nhello\r\n--c--\r\n--b--',
		),
		'b',
	);
	assert.match(nested[0]?.children?.[0]?.body.toString() ?? '', /hello/);
	const noBoundary = parseMultipart(
		Buffer.from('--b\r\nContent-Type: multipart/mixed\r\n\r\nraw\r\n--b--'),
		'b',
	);
	assert.equal(noBoundary[0]?.children, undefined);
});

test('parameter and transfer decoders handle unquoted and escaped values', () => {
	assert.equal(
		decodeContentDisposition('attachment; filename= a.txt; size=12').params.filename,
		'a.txt',
	);
	assert.equal(
		decodeContentDisposition('attachment; filename="a\\"b.txt"; trailing').params.filename,
		'a"b.txt',
	);
	assert.equal(
		decodeContentType('text/plain; charset=utf-8; format=flowed').params.charset,
		'utf-8',
	);
	const start = Date.now();
	for (const raw of ['invalid', '']) {
		const timestamp = Date.parse(decodeDate(raw));
		assert.ok(timestamp >= start && timestamp <= Date.now());
	}
	assert.equal(decodeDate('2026-01-01'), '2026-01-01T00:00:00.000Z');
	assert.equal(decodeDate('1 Jan 2026 01:00 -0100'), '2026-01-01T02:00:00.000Z');
	assert.equal(decodeDate('1 Jan 2026 00:00 UTC'), '2026-01-01T00:00:00.000Z');
	for (const encoding of ['7bit', '8bit', 'binary', 'unknown'])
		assert.equal(decodeTransferEncoding(Buffer.from('text'), encoding).toString(), 'text');
	assert.equal(decodeTransferEncoding(Buffer.from('a=20b'), 'quoted-printable').toString(), 'a b');
	const bytes = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
	assert.deepEqual(decodeQP(encodeQP(bytes)), bytes);
	assert.equal(decodeQP('a=ZZ=').toString(), 'a=ZZ=');
	assert.equal(htmlToText('&#65; &#x42; &unknown; &amp;'), 'A B &unknown; &');
});
