import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { describe, it } from 'node:test';
import { isStdinPiped, readStdin } from './stdin.ts';

describe('isStdinPiped', () => {
	it('returns true when stdin.isTTY is undefined (piped)', () => {
		const orig = process.stdin.isTTY;
		// @ts-expect-error — exactOptionalPropertyTypes: undefined is not assignable to optional boolean
		process.stdin.isTTY = undefined;
		assert.equal(isStdinPiped(), true);
		process.stdin.isTTY = orig;
	});

	it('returns false when stdin.isTTY is true (terminal)', () => {
		const orig = process.stdin.isTTY;
		process.stdin.isTTY = true;
		assert.equal(isStdinPiped(), false);
		process.stdin.isTTY = orig;
	});
});

describe('readStdin', () => {
	it('reads and concatenates chunks from a readable stream', async () => {
		const stream = Readable.from(['hello ', 'world']);
		const result = await readStdin(stream);
		assert.equal(result, 'hello world');
	});

	it('handles multi-line input', async () => {
		const stream = Readable.from(['line1\n', 'line2\n']);
		const result = await readStdin(stream);
		assert.equal(result, 'line1\nline2\n');
	});

	it('returns empty string for empty stream', async () => {
		const stream = Readable.from([]);
		const result = await readStdin(stream);
		assert.equal(result, '');
	});
});
