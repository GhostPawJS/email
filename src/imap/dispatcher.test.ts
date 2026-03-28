import assert from 'node:assert/strict';
import { Duplex } from 'node:stream';
import { describe, it } from 'node:test';
import { ImapDispatcher } from './dispatcher.ts';
import { createTagGenerator } from './tag_generator.ts';
import { ImapTokenizer } from './tokenizer.ts';

function makeMockSocket(): { socket: Duplex; written: string[] } {
	const written: string[] = [];
	const socket = new Duplex({
		read() {},
		write(chunk, _enc, cb) {
			written.push(chunk.toString());
			cb();
		},
	});
	return { socket, written };
}

describe('ImapDispatcher', () => {
	it('resolves command on tagged OK', async () => {
		const { socket, written } = makeMockSocket();
		const tokenizer = new ImapTokenizer();
		const tagGen = createTagGenerator('T');
		const d = new ImapDispatcher(socket, tokenizer, tagGen);

		const p = d.execute('NOOP');
		assert.ok(written[0]?.includes('NOOP'));

		// Feed canned response
		d.receive(Buffer.from('T0001 OK Done\r\n'));
		const result = await p;
		assert.equal(result.tagged.status, 'OK');
	});

	it('rejects command on tagged NO', async () => {
		const { socket } = makeMockSocket();
		const tokenizer = new ImapTokenizer();
		const d = new ImapDispatcher(socket, tokenizer, createTagGenerator('T'));

		const p = d.execute('LOGIN', ['user', 'bad']);
		d.receive(Buffer.from('T0001 NO Login failed\r\n'));
		await assert.rejects(p);
	});

	it('collects untagged responses for a command', async () => {
		const { socket } = makeMockSocket();
		const tokenizer = new ImapTokenizer();
		const d = new ImapDispatcher(socket, tokenizer, createTagGenerator('T'));

		const p = d.execute('SELECT', ['INBOX']);
		d.receive(Buffer.from('* 10 EXISTS\r\n* 2 RECENT\r\nT0001 OK [READ-WRITE] Done\r\n'));
		const result = await p;
		assert.equal(result.untagged.length, 2);
		assert.equal(result.untagged[0]?.type, 'EXISTS');
	});

	it('emits unsolicited data via handler', () => {
		const { socket } = makeMockSocket();
		const tokenizer = new ImapTokenizer();
		const d = new ImapDispatcher(socket, tokenizer, createTagGenerator('T'));

		const events: string[] = [];
		d.onUnsolicited((r) => events.push(r.type));

		d.receive(Buffer.from('* 3 EXISTS\r\n'));
		assert.equal(events[0], 'EXISTS');
	});

	it('destroys pending commands', async () => {
		const { socket } = makeMockSocket();
		const tokenizer = new ImapTokenizer();
		const d = new ImapDispatcher(socket, tokenizer, createTagGenerator('T'));

		const p = d.execute('IDLE');
		d.destroy();
		await assert.rejects(p);
	});

	it('executeWithLiteral sends {N} literal, waits for continuation, then sends bytes', async () => {
		const { socket, written } = makeMockSocket();
		const tokenizer = new ImapTokenizer();
		const d = new ImapDispatcher(socket, tokenizer, createTagGenerator('T'));

		const literal = Buffer.from('Hello IMAP');
		const p = d.executeWithLiteral('APPEND', ['"Sent"', '(\\Seen)'], literal);

		// First write should be the command with {N}
		assert.ok(written[0]?.includes('{10}'), 'command should carry literal size specifier');
		assert.ok(!written[0]?.includes('"10"'), 'literal specifier must not be quoted');
		assert.ok(written[0]?.includes('APPEND'), 'command name must appear');

		// Simulate server continuation response
		d.receive(Buffer.from('+ go ahead\r\n'));

		// Now the literal bytes should have been written
		assert.ok(written[1] !== undefined, 'literal bytes should be sent after continuation');

		// Simulate server final OK
		d.receive(Buffer.from('T0001 OK [APPENDUID 12345 67890] Append completed\r\n'));
		const result = await p;
		assert.equal(result.tagged.status, 'OK');
		assert.equal(result.tagged.code?.code, 'APPENDUID');
	});

	it('executeWithLiteral rejects when server sends NO', async () => {
		const { socket } = makeMockSocket();
		const tokenizer = new ImapTokenizer();
		const d = new ImapDispatcher(socket, tokenizer, createTagGenerator('T'));

		const p = d.executeWithLiteral('APPEND', ['"Drafts"'], Buffer.from('body'));

		// Server sends continuation then rejects the message
		d.receive(Buffer.from('+ go ahead\r\n'));
		d.receive(Buffer.from('T0001 NO [OVERQUOTA] mailbox full\r\n'));
		await assert.rejects(p, /NO/);
	});

	it('executeWithLiteral handles empty literal (0 bytes)', async () => {
		const { socket, written } = makeMockSocket();
		const tokenizer = new ImapTokenizer();
		const d = new ImapDispatcher(socket, tokenizer, createTagGenerator('T'));

		const p = d.executeWithLiteral('APPEND', ['"INBOX"'], Buffer.alloc(0));
		assert.ok(written[0]?.includes('{0}'), 'should use {0} for empty literal');

		d.receive(Buffer.from('+ go ahead\r\n'));
		d.receive(Buffer.from('T0001 OK Appended\r\n'));
		const result = await p;
		assert.equal(result.tagged.status, 'OK');
	});

	it('executeWithLiteral encodes folder name with spaces correctly', async () => {
		const { socket, written } = makeMockSocket();
		const tokenizer = new ImapTokenizer();
		const d = new ImapDispatcher(socket, tokenizer, createTagGenerator('T'));

		const p = d.executeWithLiteral('APPEND', ['Sent Items'], Buffer.from('x'));
		// "Sent Items" must be quoted because it contains a space
		assert.ok(written[0]?.includes('"Sent Items"'), 'folder with spaces should be quoted');

		d.receive(Buffer.from('+ go ahead\r\n'));
		d.receive(Buffer.from('T0001 OK Done\r\n'));
		await p;
	});
});
