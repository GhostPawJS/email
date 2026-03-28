import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decodeBodyStructure } from './decode_bodystructure.ts';

describe('decodeBodyStructure', () => {
	it('decodes a simple text/plain body structure (grouped format)', () => {
		// Equivalent to: (TEXT PLAIN (CHARSET us-ascii) NIL NIL 7bit 123 5)
		// After collectItems, parens become arrays:
		const data = ['TEXT', 'PLAIN', ['CHARSET', 'us-ascii'], null, null, '7bit', 123, 5];
		const bs = decodeBodyStructure(data);
		assert.equal(bs.type, 'text');
		assert.equal(bs.subtype, 'plain');
		assert.equal(bs.encoding?.toLowerCase(), '7bit');
		assert.equal(bs.size, 123);
		assert.equal(bs.params.charset, 'us-ascii');
	});

	it('decodes multipart', () => {
		// Equivalent to: ((TEXT PLAIN () NIL NIL 7bit 10 1) (TEXT HTML () NIL NIL 7bit 20 2) ALTERNATIVE)
		const data = [
			['TEXT', 'PLAIN', [], null, null, '7bit', 10, 1],
			['TEXT', 'HTML', [], null, null, '7bit', 20, 2],
			'ALTERNATIVE',
		];
		const bs = decodeBodyStructure(data);
		assert.equal(bs.type, 'multipart');
		assert.equal(bs.subtype, 'alternative');
		assert.equal(bs.children?.length, 2);
	});

	it('returns default for empty data array', () => {
		const bs = decodeBodyStructure([]);
		assert.ok(bs.type !== undefined);
	});

	it('parses Content-Disposition extended field', () => {
		// text/plain with md5=NIL, disposition=("attachment" ("filename" "report.pdf"))
		const data = [
			'TEXT',
			'PLAIN',
			['CHARSET', 'utf-8'],
			null, // content-id
			null, // description
			'7bit',
			1234,
			42, // lines
			null, // md5
			['attachment', ['filename', 'report.pdf']], // disposition
		];
		const bs = decodeBodyStructure(data);
		assert.ok(bs.disposition !== null && bs.disposition !== undefined);
		assert.equal(bs.disposition?.type, 'attachment');
		assert.equal(bs.disposition?.params.filename, 'report.pdf');
	});

	it('treats NIL disposition as null', () => {
		const data = [
			'TEXT',
			'PLAIN',
			[],
			null,
			null,
			'7bit',
			100,
			5, // lines
			null, // md5
			null, // NIL disposition
		];
		const bs = decodeBodyStructure(data);
		assert.ok(bs.disposition === null || bs.disposition === undefined);
	});
});
