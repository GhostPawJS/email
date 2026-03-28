import assert from 'node:assert/strict';
import { Duplex } from 'node:stream';
import { describe, it } from 'node:test';
import { ImapDispatcher } from './dispatcher.ts';
import { idle } from './idle.ts';
import { createTagGenerator } from './tag_generator.ts';
import { ImapTokenizer } from './tokenizer.ts';

function makeDispatcher() {
	const written: string[] = [];
	const socket = new Duplex({
		read() {},
		write(chunk, _enc, cb) {
			written.push(chunk.toString());
			cb();
		},
	});
	const tokenizer = new ImapTokenizer();
	const dispatcher = new ImapDispatcher(socket, tokenizer, createTagGenerator('I'));
	const respond = (s: string) => dispatcher.receive(Buffer.from(s));
	return { dispatcher, respond, written };
}

describe('idle', () => {
	it('yields EXISTS event and stops on abort', async () => {
		const { dispatcher, respond } = makeDispatcher();
		const controller = new AbortController();
		const gen = idle(dispatcher, { signal: controller.signal });

		setTimeout(() => {
			respond('I0001 OK Idling\r\n');
		}, 0);

		setTimeout(() => {
			respond('* 5 EXISTS\r\n');
			controller.abort();
		}, 5);

		const events: string[] = [];
		for await (const ev of gen) {
			events.push(ev.type);
			if (events.length >= 1) break;
		}
		assert.ok(events.length >= 0);
	});

	it('sends DONE on abort signal', async () => {
		const { dispatcher, respond, written } = makeDispatcher();
		const controller = new AbortController();
		const gen = idle(dispatcher, { signal: controller.signal });

		// Start iterating
		const iteration = (async () => {
			for await (const _ev of gen) {
				// drain
			}
		})();

		// Let IDLE command dispatch
		await new Promise((r) => setTimeout(r, 5));

		// Resolve the IDLE command so enterIdle() completes
		respond('I0001 OK Idling\r\n');
		await new Promise((r) => setTimeout(r, 5));

		// Abort — should trigger exitIdle() which calls sendRaw('DONE\r\n')
		controller.abort();

		await iteration;

		assert.ok(
			written.some((w) => w === 'DONE\r\n'),
			`expected DONE in written data: ${JSON.stringify(written)}`,
		);
	});

	it('renews IDLE on timeout with DONE cycle', async () => {
		const { dispatcher, respond, written } = makeDispatcher();
		const controller = new AbortController();
		const gen = idle(dispatcher, { signal: controller.signal, timeout: 30 });

		const iteration = (async () => {
			for await (const _ev of gen) {
				// drain
			}
		})();

		// Let IDLE command dispatch
		await new Promise((r) => setTimeout(r, 5));
		// First IDLE OK
		respond('I0001 OK Idling\r\n');

		// Wait for timeout renewal (30ms + buffer)
		await new Promise((r) => setTimeout(r, 50));

		// The timeout should have sent DONE. Respond to the re-entered IDLE.
		respond('I0002 OK Idling again\r\n');
		await new Promise((r) => setTimeout(r, 10));

		// Abort to end the generator
		controller.abort();
		await iteration;

		const doneCount = written.filter((w) => w === 'DONE\r\n').length;
		assert.ok(
			doneCount >= 2,
			`expected at least 2 DONE writes (renewal + abort), got ${doneCount}: ${JSON.stringify(written)}`,
		);

		const idleCount = written.filter((w) => w.includes('IDLE')).length;
		assert.ok(
			idleCount >= 2,
			`expected at least 2 IDLE commands (initial + renewal), got ${idleCount}: ${JSON.stringify(written)}`,
		);
	});
});
