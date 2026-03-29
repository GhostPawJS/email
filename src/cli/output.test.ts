import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { bold, dim, isTTY, print, printError, red, useColor, yellow } from './output.ts';

describe('output', () => {
	// Force non-TTY for deterministic tests.
	let originalIsTTY: boolean | undefined;
	let originalNoColor: string | undefined;

	before(() => {
		originalIsTTY = process.stdout.isTTY;
		originalNoColor = process.env['NO_COLOR'];
		process.stdout.isTTY = false;
		delete process.env['NO_COLOR'];
	});

	after(() => {
		// @ts-expect-error — restoring boolean | undefined to a field typed as boolean
		process.stdout.isTTY = originalIsTTY;
		if (originalNoColor !== undefined) {
			process.env['NO_COLOR'] = originalNoColor;
		} else {
			delete process.env['NO_COLOR'];
		}
	});

	it('isTTY returns false when stdout.isTTY is false', () => {
		assert.equal(isTTY(), false);
	});

	it('useColor returns false when not TTY', () => {
		assert.equal(useColor(), false);
	});

	it('useColor returns false when NO_COLOR is set', () => {
		process.stdout.isTTY = true;
		process.env['NO_COLOR'] = '1';
		assert.equal(useColor(), false);
		process.stdout.isTTY = false;
		delete process.env['NO_COLOR'];
	});

	it('useColor returns false when TERM=dumb', () => {
		process.stdout.isTTY = true;
		const prev = process.env['TERM'];
		process.env['TERM'] = 'dumb';
		assert.equal(useColor(), false);
		process.stdout.isTTY = false;
		if (prev !== undefined) process.env['TERM'] = prev;
		else delete process.env['TERM'];
	});

	it('bold returns plain string when no color', () => {
		assert.equal(bold('hello'), 'hello');
	});

	it('dim returns plain string when no color', () => {
		assert.equal(dim('hello'), 'hello');
	});

	it('red returns plain string when no color', () => {
		assert.equal(red('hello'), 'hello');
	});

	it('yellow returns plain string when no color', () => {
		assert.equal(yellow('hello'), 'hello');
	});

	it('print writes to stdout with newline', () => {
		const chunks: string[] = [];
		const originalWrite = process.stdout.write.bind(process.stdout);
		process.stdout.write = (chunk: unknown) => {
			chunks.push(String(chunk));
			return true;
		};
		print('test message');
		process.stdout.write = originalWrite;
		assert.equal(chunks[0], 'test message\n');
	});

	it('printError writes to stderr with newline', () => {
		const chunks: string[] = [];
		const originalWrite = process.stderr.write.bind(process.stderr);
		process.stderr.write = (chunk: unknown) => {
			chunks.push(String(chunk));
			return true;
		};
		printError('error message');
		process.stderr.write = originalWrite;
		assert.equal(chunks[0], 'error message\n');
	});
});
