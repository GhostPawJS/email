import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCommand } from './command_builder.ts';

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
