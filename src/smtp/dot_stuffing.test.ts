import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dotStuff, dotUnstuff } from './dot_stuffing.ts';

describe('dotStuff', () => {
	it('prepends dot to lines starting with dot', () => {
		const result = dotStuff('Normal\r\n.Hidden line\r\n..Double');
		const lines = result.split('\r\n');
		assert.equal(lines[0], 'Normal');
		assert.equal(lines[1], '..Hidden line');
		assert.equal(lines[2], '...Double');
	});

	it('leaves normal lines unchanged', () => {
		assert.equal(dotStuff('Hello\r\nWorld'), 'Hello\r\nWorld');
	});

	it('round-trips via dotUnstuff', () => {
		const original = 'Normal\r\n.Dotted\r\n..Double dot';
		assert.equal(dotUnstuff(dotStuff(original)), original);
	});
});
