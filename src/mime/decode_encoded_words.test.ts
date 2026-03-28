import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decodeEncodedWords } from './decode_encoded_words.ts';

describe('decodeEncodedWords', () => {
	it('decodes base64 encoded word', () => {
		// =?utf-8?B?SGVsbG8gV29ybGQ=?= → "Hello World"
		assert.equal(decodeEncodedWords('=?utf-8?B?SGVsbG8gV29ybGQ=?='), 'Hello World');
	});

	it('decodes QP encoded word', () => {
		assert.equal(decodeEncodedWords('=?utf-8?Q?Hello_World?='), 'Hello World');
	});

	it('passes plain text through unchanged', () => {
		assert.equal(decodeEncodedWords('Plain text'), 'Plain text');
	});

	it('omits whitespace between adjacent encoded words', () => {
		const a = '=?utf-8?B?SGVsbG8=?=';
		const b = '=?utf-8?B?V29ybGQ=?=';
		// Adjacent encoded words separated only by whitespace must be concatenated
		assert.equal(decodeEncodedWords(`${a} ${b}`), 'HelloWorld');
	});

	it('preserves whitespace between encoded word and plain text', () => {
		const result = decodeEncodedWords('=?utf-8?B?SGVsbG8=?= World');
		assert.equal(result, 'Hello World');
	});

	it('handles ISO-8859-1 charset', () => {
		// =?iso-8859-1?Q?Caf=E9?= → "Café"
		const result = decodeEncodedWords('=?iso-8859-1?Q?Caf=E9?=');
		assert.equal(result, 'Café');
	});
});
