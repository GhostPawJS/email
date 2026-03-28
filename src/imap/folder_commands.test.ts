import assert from 'node:assert/strict';
import { Duplex } from 'node:stream';
import { describe, it } from 'node:test';
import { ImapDispatcher } from './dispatcher.ts';
import { listFolders, selectFolder } from './folder_commands.ts';
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
	const dispatcher = new ImapDispatcher(socket, tokenizer, createTagGenerator('F'));
	return {
		dispatcher,
		respond: (s: string) => dispatcher.receive(Buffer.from(s)),
	};
}

describe('listFolders', () => {
	it('parses LIST responses into Folder objects', async () => {
		const { dispatcher, respond } = makeDispatcher();
		const p = listFolders(dispatcher);
		respond(
			'* LIST (\\HasNoChildren) "/" INBOX\r\n* LIST (\\Sent \\HasNoChildren) "/" Sent\r\nF0001 OK List complete\r\n',
		);
		const folders = await p;
		assert.equal(folders.length, 2);
		assert.equal(folders[0]?.path, 'INBOX');
		assert.equal(folders[1]?.path, 'Sent');
	});
});

describe('selectFolder', () => {
	it('parses SELECT response into SelectedFolder', async () => {
		const { dispatcher, respond } = makeDispatcher();
		const p = selectFolder(dispatcher, 'INBOX');
		respond(
			'* 10 EXISTS\r\n* 0 RECENT\r\n* OK [UIDVALIDITY 12345] Ok\r\n* OK [UIDNEXT 42] Ok\r\nF0001 OK [READ-WRITE] Done\r\n',
		);
		const sel = await p;
		assert.equal(sel.exists, 10);
		assert.equal(sel.uidValidity, 12345);
		assert.equal(sel.uidNext, 42);
	});
});
