import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCommand, encodeArg, encodeArgs, raw } from './command_builder.ts';

describe('buildCommand', () => {
	it('builds simple command', () => {
		assert.equal(buildCommand('A0001', 'NOOP'), 'A0001 NOOP\r\n');
	});

	it('quotes arguments with spaces', () => {
		const cmd = buildCommand('A0002', 'SELECT', ['My Folder']);
		assert.ok(cmd.includes('"My Folder"'));
	});

	it('passes simple atom arguments through unquoted', () => {
		const cmd = buildCommand('A0003', 'STATUS', ['INBOX']);
		assert.ok(cmd.includes('INBOX'));
		assert.ok(!cmd.includes('"'));
	});
});

describe('encodeArg', () => {
	it('encodes empty string as ""', () => {
		assert.equal(encodeArg(''), '""');
	});

	it('passes plain atoms through unchanged', () => {
		assert.equal(encodeArg('INBOX'), 'INBOX');
		assert.equal(encodeArg('FLAGS'), 'FLAGS');
	});

	it('quotes wildcard *', () => {
		assert.equal(encodeArg('*'), '"*"');
	});

	it('quotes arguments containing spaces', () => {
		assert.equal(encodeArg('My Folder'), '"My Folder"');
	});

	it('escapes quotes inside quoted string', () => {
		const encoded = encodeArg('say "hello"');
		assert.equal(encoded, '"say \\"hello\\""');
	});

	it('does not double-encode already-quoted IMAP strings', () => {
		// Pre-quoted strings like '""' should NOT be passed — callers pass raw values.
		// But if they do, ensure quotes are escaped rather than silently dropped.
		const encoded = encodeArg('""');
		assert.ok(encoded.includes('\\"'), `expected escaped quote, got: ${encoded}`);
	});

	it('encodes IMAP special chars like brackets', () => {
		const encoded = encodeArg('[Gmail]/Sent Mail');
		assert.ok(encoded.startsWith('"') && encoded.endsWith('"'));
	});
});

describe('raw', () => {
	it('creates a RawArg that bypasses quoting in buildCommand', () => {
		const cmd = buildCommand('A0004', 'UID FETCH', [raw('1:*'), raw('(UID FLAGS)')]);
		assert.equal(cmd, 'A0004 UID FETCH 1:* (UID FLAGS)\r\n');
	});

	it('preserves backslashes in flag lists', () => {
		const cmd = buildCommand('A0005', 'UID STORE', [
			raw('1,2,3'),
			raw('+FLAGS.SILENT'),
			raw('(\\Seen \\Flagged)'),
		]);
		assert.equal(cmd, 'A0005 UID STORE 1,2,3 +FLAGS.SILENT (\\Seen \\Flagged)\r\n');
	});
});

describe('encodeArgs', () => {
	it('encodes a mixed list of raw and plain string args', () => {
		const result = encodeArgs([raw('1:*'), 'INBOX', raw('(UID FLAGS)')]);
		assert.equal(result, '1:* INBOX (UID FLAGS)');
	});

	it('quotes plain strings that need it', () => {
		const result = encodeArgs(['My Folder', raw('(\\Draft)')]);
		assert.equal(result, '"My Folder" (\\Draft)');
	});

	it('handles empty list', () => {
		assert.equal(encodeArgs([]), '');
	});
});
