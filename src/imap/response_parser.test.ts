import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseResponse } from './response_parser.ts';
import { ImapTokenizer } from './tokenizer.ts';

function parse(line: string) {
	const t = new ImapTokenizer();
	t.feed(Buffer.from(`${line}\r\n`));
	return parseResponse(t.readAll().filter((tok) => tok.type !== 'crlf'));
}

describe('parseResponse', () => {
	it('parses tagged OK with code', () => {
		const r = parse('A0001 OK [UIDVALIDITY 12345] Done');
		assert.equal(r.kind, 'tagged');
		if (r.kind !== 'tagged') return;
		assert.equal(r.tag, 'A0001');
		assert.equal(r.status, 'OK');
		assert.equal(r.code?.code, 'UIDVALIDITY');
		assert.equal(r.code?.value, 12345);
	});

	it('parses tagged NO', () => {
		const r = parse('A0002 NO Login failed');
		assert.equal(r.kind, 'tagged');
		if (r.kind !== 'tagged') return;
		assert.equal(r.status, 'NO');
	});

	it('parses tagged BAD', () => {
		const r = parse('A0003 BAD Command unknown');
		assert.equal(r.kind, 'tagged');
		if (r.kind !== 'tagged') return;
		assert.equal(r.status, 'BAD');
	});

	it('parses untagged EXISTS', () => {
		const r = parse('* 10 EXISTS');
		assert.equal(r.kind, 'untagged');
		if (r.kind !== 'untagged') return;
		assert.equal(r.type, 'EXISTS');
		assert.equal(r.number, 10);
	});

	it('parses untagged EXPUNGE', () => {
		const r = parse('* 5 EXPUNGE');
		assert.equal(r.kind, 'untagged');
		if (r.kind !== 'untagged') return;
		assert.equal(r.type, 'EXPUNGE');
		assert.equal(r.number, 5);
	});

	it('parses continuation', () => {
		const r = parse('+ idling');
		assert.equal(r.kind, 'continuation');
		if (r.kind !== 'continuation') return;
		assert.ok(r.text.includes('idling'));
	});

	it('parses PERMANENTFLAGS code', () => {
		const r = parse('* OK [PERMANENTFLAGS (\\Seen \\Flagged)] Flags');
		assert.equal(r.kind, 'untagged');
		if (r.kind !== 'untagged') return;
		assert.equal(r.code?.code, 'PERMANENTFLAGS');
		assert.ok(Array.isArray(r.code?.value));
	});
});
