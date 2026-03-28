import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ImapTokenizer } from './tokenizer.ts';

describe('ImapTokenizer', () => {
	it('tokenizes simple atoms and numbers', () => {
		const t = new ImapTokenizer();
		t.feed(Buffer.from('* 3 EXISTS\r\n'));
		const toks = t.readAll();
		assert.equal(toks[0]?.type, 'star');
		assert.equal(toks[1]?.type, 'number');
		assert.equal(toks[1]?.value, 3);
		assert.equal(toks[2]?.type, 'atom');
		assert.equal(toks[2]?.value, 'EXISTS');
		assert.equal(toks[3]?.type, 'crlf');
	});

	it('tokenizes quoted strings with escapes', () => {
		const t = new ImapTokenizer();
		t.feed(Buffer.from('"Hello \\"world\\""'));
		const toks = t.readAll();
		assert.equal(toks[0]?.type, 'quoted');
		assert.equal(toks[0]?.value, 'Hello "world"');
	});

	it('tokenizes NIL as nil type', () => {
		const t = new ImapTokenizer();
		t.feed(Buffer.from('NIL nil Nil\r\n'));
		const toks = t.readAll().filter((tok) => tok.type !== 'crlf');
		assert.equal(toks.length, 3);
		for (const tok of toks) {
			assert.equal(tok.type, 'nil');
			assert.equal(tok.value, null);
		}
	});

	it('handles partial feeds', () => {
		const t = new ImapTokenizer();
		t.feed(Buffer.from('* 1 FETCH'));
		t.feed(Buffer.from(' (UID 42)\r\n'));
		const toks = t.readAll();
		assert.equal(toks[0]?.type, 'star');
		assert.equal(toks[2]?.type, 'atom');
		assert.equal(toks[2]?.value, 'FETCH');
		assert.equal(toks[4]?.type, 'atom');
		assert.equal(toks[4]?.value, 'UID');
		assert.equal(toks[5]?.value, 42);
	});

	it('handles literals spanning chunks', () => {
		const t = new ImapTokenizer();
		t.feed(Buffer.from('{5}\r\nhe'));
		t.feed(Buffer.from('llo'));
		const toks = t.readAll();
		assert.equal(toks[0]?.type, 'literal');
		assert.ok(Buffer.isBuffer(toks[0]?.value));
		assert.equal((toks[0]?.value as Buffer).toString(), 'hello');
	});

	it('tokenizes parens and brackets', () => {
		const t = new ImapTokenizer();
		t.feed(Buffer.from('(FLAGS [\\Seen])'));
		const toks = t.readAll();
		assert.equal(toks[0]?.type, 'lparen');
		assert.equal(toks[1]?.type, 'atom');
		assert.equal(toks[2]?.type, 'lbracket');
		assert.equal(toks[3]?.type, 'atom');
		assert.equal(toks[4]?.type, 'rbracket');
		assert.equal(toks[5]?.type, 'rparen');
	});
});
