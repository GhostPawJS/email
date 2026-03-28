import assert from 'node:assert/strict';
import { Duplex } from 'node:stream';
import { describe, it } from 'node:test';
import { ImapDispatcher } from './dispatcher.ts';
import { fetchMessages, searchMessages, storeFlags } from './message_commands.ts';
import { createTagGenerator } from './tag_generator.ts';
import { ImapTokenizer } from './tokenizer.ts';

function makeDispatcher() {
	const socket = new Duplex({
		read() {},
		write(_c, _e, cb) {
			cb();
		},
	});
	const tokenizer = new ImapTokenizer();
	const dispatcher = new ImapDispatcher(socket, tokenizer, createTagGenerator('M'));
	return {
		dispatcher,
		respond: (s: string) => dispatcher.receive(Buffer.from(s)),
	};
}

describe('fetchMessages', () => {
	it('returns parsed FetchResults', async () => {
		const { dispatcher, respond } = makeDispatcher();
		const p = fetchMessages(dispatcher, '1:*', ['UID', 'FLAGS']);
		respond('* 1 FETCH (UID 42 FLAGS (\\Seen))\r\nM0001 OK Fetch done\r\n');
		const results = await p;
		assert.equal(results.length, 1);
		assert.equal(results[0]?.uid, 42);
		assert.ok(results[0]?.flags.includes('\\Seen'));
	});
});

describe('searchMessages', () => {
	it('returns UID list from SEARCH response', async () => {
		const { dispatcher, respond } = makeDispatcher();
		const p = searchMessages(dispatcher, 'UNSEEN');
		respond('* SEARCH 10 20 30\r\nM0001 OK Search done\r\n');
		const uids = await p;
		assert.deepEqual(uids, [10, 20, 30]);
	});
});

describe('storeFlags', () => {
	it('sends UID STORE command', async () => {
		const { dispatcher, respond } = makeDispatcher();
		const p = storeFlags(dispatcher, [1, 2], '+FLAGS.SILENT', ['\\Seen']);
		respond('M0001 OK Store done\r\n');
		await assert.doesNotReject(p);
	});
});
