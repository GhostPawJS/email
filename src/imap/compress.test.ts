import assert from 'node:assert/strict';
import { Duplex } from 'node:stream';
import { describe, it } from 'node:test';
import { enableCompression } from './compress.ts';
import { ImapDispatcher } from './dispatcher.ts';
import { createTagGenerator } from './tag_generator.ts';
import { ImapTokenizer } from './tokenizer.ts';

describe('enableCompression', () => {
	it('sends COMPRESS DEFLATE and returns true on OK', async () => {
		const written: string[] = [];
		const socket = new Duplex({
			read() {},
			write(c, _e, cb) {
				written.push(c.toString());
				cb();
			},
		});
		const tokenizer = new ImapTokenizer();
		const dispatcher = new ImapDispatcher(socket, tokenizer, createTagGenerator('C'));

		const p = enableCompression(dispatcher);
		dispatcher.receive(Buffer.from('C0001 OK DEFLATE active\r\n'));
		const ok = await p;
		assert.equal(ok, true, 'should return true when server accepts compression');
		assert.ok(written.some((w) => w.includes('COMPRESS')));
	});

	it('returns false when server declines compression with NO', async () => {
		const socket = new Duplex({
			read() {},
			write(_c, _e, cb) {
				cb();
			},
		});
		const tokenizer = new ImapTokenizer();
		const dispatcher = new ImapDispatcher(socket, tokenizer, createTagGenerator('C'));

		const p = enableCompression(dispatcher);
		// Server sends NO — compression unavailable
		dispatcher.receive(Buffer.from('C0001 NO DEFLATE not supported\r\n'));
		const ok = await p;
		assert.equal(ok, false, 'should return false when server declines compression');
	});
});
