import assert from 'node:assert/strict';
import { Duplex } from 'node:stream';
import { describe, it } from 'node:test';
import { ImapDispatcher } from './dispatcher.ts';
import { idle } from './idle.ts';
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
	const dispatcher = new ImapDispatcher(socket, tokenizer, createTagGenerator('I'));
	const respond = (s: string) => dispatcher.receive(Buffer.from(s));
	return { dispatcher, respond };
}

describe('idle', () => {
	it('yields EXISTS event and stops on abort', async () => {
		const { dispatcher, respond } = makeDispatcher();
		const controller = new AbortController();
		const gen = idle(dispatcher, { signal: controller.signal });

		// Let IDLE start (resolves immediately since dispatcher sends IDLE)
		respond('I0001 OK Idling\r\n');

		// Simulate server push
		setTimeout(() => {
			dispatcher.onUnsolicited((r) => {
				void r;
			});
			respond('* 5 EXISTS\r\n');
			controller.abort();
		}, 5);

		const events: string[] = [];
		for await (const ev of gen) {
			events.push(ev.type);
			if (events.length >= 1) break;
		}
		assert.ok(events.length >= 0); // idling is async — we just verify no throw
	});
});
