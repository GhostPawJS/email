import assert from 'node:assert/strict';
import test from 'node:test';

import type { Attachment, AttachmentMeta } from '../types/attachment.ts';
import type { Folder } from '../types/folder.ts';
import type { Message, MessageDetail } from '../types/message.ts';
import type { SyncResult } from '../types/sync.ts';
import type { Thread } from '../types/thread.ts';
import { emailTools } from './email_tools.ts';
import type { EmailToolContext, EmailToolDefinition } from './tool_metadata.ts';
import type { EmailToolResult } from './tool_types.ts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Look up a tool and cast to EmailToolDefinition<unknown> so tests can call
 * handler(ctx, anyInput) without fighting union-parameter-intersection never types.
 */
function getTool(name: string): EmailToolDefinition<unknown> {
	const found = emailTools.find((t) => t.name === name);
	assert.ok(found, `Tool "${name}" not found`);
	return found as unknown as EmailToolDefinition<unknown>;
}

// ─── Mock fixtures ────────────────────────────────────────────────────────────

const defaultFolder: Folder = {
	id: 1,
	accountId: 1,
	path: 'INBOX',
	delimiter: '/',
	role: 'inbox',
	uidValidity: 1,
	uidNext: 100,
	highestModSeq: 0,
	messageCount: 5,
	unseenCount: 3,
	lastSyncedAt: null,
};

const defaultMessage: Message = {
	id: 1,
	uid: 42,
	folderId: 1,
	subject: 'Hello',
	flags: [],
	labels: [],
	from: { address: 'alice@example.com' },
	to: [{ address: 'bob@example.com' }],
	cc: [],
	bcc: [],
	replyTo: null,
	date: '2026-01-01T00:00:00Z',
	receivedAt: '2026-01-01T00:00:00Z',
	messageId: '<msg1@local>',
	references: [],
	inReplyTo: null,
	threadId: 'thread-1',
	size: 1000,
	hasAttachments: false,
	bodyStructure: null,
	modSeq: null,
	envelopeFrom: null,
	envelopeTo: [],
};

const defaultMessageDetail: MessageDetail = {
	...defaultMessage,
	textPlain: 'body text',
	textHtml: null,
	attachments: [],
};

const defaultThread: Thread = {
	threadId: 'thread-1',
	subject: 'Hello thread',
	messages: [{ ...defaultMessage, depth: 0 }],
	participants: [{ address: 'alice@example.com' }],
	messageCount: 1,
	unreadCount: 1,
	lastDate: '2026-01-01T00:00:00Z',
};

const defaultAttachmentMeta: AttachmentMeta = {
	id: 1,
	messageId: 1,
	partPath: '2',
	filename: 'report.pdf',
	mimeType: 'application/pdf',
	size: 5000,
	contentId: null,
	inline: false,
};

const defaultAttachment: Attachment = {
	...defaultAttachmentMeta,
	data: Buffer.from('PDF data'),
};

const defaultSyncResult: SyncResult = {
	folders: [{ path: 'INBOX', newMessages: 3, updatedFlags: 1, expunged: 0, duration: 100 }],
	totalNew: 3,
	totalExpunged: 0,
};

// ─── Mock context builder ─────────────────────────────────────────────────────

function makeContext(overrides: Partial<EmailToolContext> = {}): EmailToolContext {
	const read = overrides.read ?? {
		folders: () => [defaultFolder],
		folderStatus: () => ({
			messages: 5,
			unseen: 3,
			uidNext: 100,
			uidValidity: 1,
			highestModSeq: null,
		}),
		messages: () => [defaultMessage],
		threads: () => [defaultThread],
		getThread: (_id: string) => defaultThread,
		getMessage: async (_folder: string, _uid: number) => defaultMessageDetail,
		listAttachments: (_folder: string, _uid: number) => [defaultAttachmentMeta],
		getAttachment: async (_folder: string, _uid: number, _partPath: string) => defaultAttachment,
		search: (_query: string) => [defaultMessage],
		stats: () => ({
			folders: [],
			totalMessages: 5,
			totalUnread: 3,
			lastSyncedAt: null,
			storageUsed: 0,
		}),
		getDatabase: () => {
			throw new Error('no db in mock');
		},
	};

	const write = overrides.write ?? {
		markRead: async () => {},
		markUnread: async () => {},
		star: async () => {},
		unstar: async () => {},
		markAnswered: async () => {},
		copyTo: async () => {},
		moveTo: async () => {},
		archive: async () => {},
		trash: async () => {},
		moveToJunk: async () => {},
		markNotJunk: async () => {},
		delete: async () => {},
		addLabels: async () => {},
		removeLabels: async () => {},
		setLabels: async () => {},
		send: async () => ({ messageId: '<sent@local>' }),
		reply: async () => ({ messageId: '<reply@local>' }),
		forward: async () => ({ messageId: '<fwd@local>' }),
		saveDraft: async () => ({ uid: 10 }),
		updateDraft: async () => ({ uid: 11 }),
		sendDraft: async () => ({ messageId: '<draft-sent@local>' }),
		createFolder: async () => {},
		renameFolder: async () => {},
		deleteFolder: async () => {},
		subscribeFolder: async () => {},
		unsubscribeFolder: async () => {},
		exportEml: async () => Buffer.from('raw eml bytes'),
		importEml: async () => ({ uid: 20 }),
	};

	const network = overrides.network ?? {
		connect: async () => {},
		disconnect: async () => {},
		reconnect: async () => {},
		sync: async () => defaultSyncResult,
		watch: async function* () {},
		refreshFolders: async () => [defaultFolder],
		searchRemote: async () => [42, 43],
		fetchBody: async () => ({ textPlain: 'body', textHtml: null }),
		fetchAttachment: async () => defaultAttachment,
	};

	return { read, write, network };
}

// ─── mail_read ────────────────────────────────────────────────────────────────

test('mail_read: view=folders returns folder entities', async () => {
	const result = (await getTool('mail_read').handler(makeContext(), {
		view: 'folders',
	})) as EmailToolResult;
	assert.equal(result.outcome, 'success');
	assert.match(result.summary, /folder/);
	assert.equal(result.entities[0]?.kind, 'mailbox');
	assert.equal(result.entities[0]?.id, 'INBOX');
});

test('mail_read: view=folders with refresh=true calls network.refreshFolders', async () => {
	let refreshCalled = false;
	const ctx = makeContext({
		network: {
			...makeContext().network,
			refreshFolders: async () => {
				refreshCalled = true;
				return [defaultFolder];
			},
		},
	});
	const result = (await getTool('mail_read').handler(ctx, {
		view: 'folders',
		refresh: true,
	})) as EmailToolResult;
	assert.ok(refreshCalled);
	assert.equal(result.outcome, 'success');
});

test('mail_read: view=queue returns message entities', async () => {
	const result = (await getTool('mail_read').handler(makeContext(), {
		view: 'queue',
		folder: 'INBOX',
	})) as EmailToolResult;
	assert.equal(result.outcome, 'success');
	assert.equal(result.entities[0]?.kind, 'message');
	assert.equal(result.entities[0]?.id, '42');
});

test('mail_read: view=queue unreadOnly filters seen messages', async () => {
	const seenMsg: Message = { ...defaultMessage, uid: 99, flags: ['\\Seen'] };
	const ctx = makeContext({ read: { ...makeContext().read, messages: () => [seenMsg] } });
	const result = (await getTool('mail_read').handler(ctx, {
		view: 'queue',
		folder: 'INBOX',
		unreadOnly: true,
	})) as EmailToolResult;
	assert.equal(result.entities.length, 0);
});

test('mail_read: view=thread returns thread entity', async () => {
	const result = (await getTool('mail_read').handler(makeContext(), {
		view: 'thread',
		threadId: 'thread-1',
	})) as EmailToolResult;
	assert.equal(result.outcome, 'success');
	assert.equal(result.entities[0]?.kind, 'thread');
	assert.equal(result.entities[0]?.id, 'thread-1');
});

test('mail_read: view=message fetches body via read.getMessage', async () => {
	let called = false;
	const ctx = makeContext({
		read: {
			...makeContext().read,
			getMessage: async () => {
				called = true;
				return defaultMessageDetail;
			},
		},
	});
	const result = (await getTool('mail_read').handler(ctx, {
		view: 'message',
		folder: 'INBOX',
		uid: 42,
	})) as EmailToolResult;
	assert.ok(called);
	assert.equal(result.outcome, 'success');
	assert.match(result.summary, /Hello/);
});

test('mail_read: view=attachment without partPath lists metadata', async () => {
	const result = (await getTool('mail_read').handler(makeContext(), {
		view: 'attachment',
		folder: 'INBOX',
		uid: 42,
	})) as EmailToolResult;
	assert.equal(result.outcome, 'success');
	assert.equal(result.entities[0]?.kind, 'attachment');
	assert.equal(result.entities[0]?.id, '2');
	assert.match(result.summary, /attachment/);
});

test('mail_read: view=attachment with partPath fetches binary', async () => {
	const result = (await getTool('mail_read').handler(makeContext(), {
		view: 'attachment',
		folder: 'INBOX',
		uid: 42,
		partPath: '2',
	})) as EmailToolResult;
	assert.equal(result.outcome, 'success');
	assert.match(result.summary, /report\.pdf/);
	assert.match(result.summary, /bytes/);
});

test('mail_read: view=eml exports raw bytes', async () => {
	const result = (await getTool('mail_read').handler(makeContext(), {
		view: 'eml',
		folder: 'INBOX',
		uid: 42,
	})) as EmailToolResult;
	assert.equal(result.outcome, 'success');
	assert.match(result.summary, /bytes/);
});

test('mail_read: returns error outcome on surface failure', async () => {
	const ctx = makeContext({
		read: {
			...makeContext().read,
			getMessage: async () => {
				throw new Error('Network gone');
			},
		},
	});
	const result = (await getTool('mail_read').handler(ctx, {
		view: 'message',
		folder: 'INBOX',
		uid: 42,
	})) as EmailToolResult;
	assert.equal(result.outcome, 'error');
	assert.match(result.summary, /Network gone/);
});

// ─── mail_search ──────────────────────────────────────────────────────────────

test('mail_search: local mode returns FTS results', async () => {
	const result = (await getTool('mail_search').handler(makeContext(), {
		query: 'hello',
	})) as EmailToolResult;
	assert.equal(result.outcome, 'success');
	assert.match(result.summary, /Found 1/);
	assert.equal(result.entities[0]?.kind, 'message');
});

test('mail_search: remote mode calls network.searchRemote', async () => {
	let remoteCalled = false;
	const ctx = makeContext({
		network: {
			...makeContext().network,
			searchRemote: async () => {
				remoteCalled = true;
				return [55, 56];
			},
		},
	});
	const result = (await getTool('mail_search').handler(ctx, {
		query: 'invoice',
		mode: 'remote',
		folder: 'INBOX',
	})) as EmailToolResult;
	assert.ok(remoteCalled);
	assert.equal(result.entities.length, 2);
	assert.equal(result.entities[0]?.id, '55');
});

test('mail_search: empty remote result returns success with no entities', async () => {
	const ctx = makeContext({ network: { ...makeContext().network, searchRemote: async () => [] } });
	const result = (await getTool('mail_search').handler(ctx, {
		query: 'xyz',
		mode: 'remote',
		folder: 'INBOX',
	})) as EmailToolResult;
	assert.equal(result.outcome, 'success');
	assert.equal(result.entities.length, 0);
});

test('mail_search: defaults to local when mode is omitted', async () => {
	let searchCalled = false;
	const ctx = makeContext({
		read: {
			...makeContext().read,
			search: () => {
				searchCalled = true;
				return [];
			},
		},
	});
	await getTool('mail_search').handler(ctx, { query: 'test' });
	assert.ok(searchCalled);
});

test('mail_search: returns error outcome on surface failure', async () => {
	const ctx = makeContext({
		read: {
			...makeContext().read,
			search: () => {
				throw new Error('FTS crashed');
			},
		},
	});
	const result = (await getTool('mail_search').handler(ctx, { query: 'test' })) as EmailToolResult;
	assert.equal(result.outcome, 'error');
	assert.match(result.summary, /FTS crashed/);
});

// ─── mail_compose ─────────────────────────────────────────────────────────────

test('mail_compose: send returns messageId', async () => {
	const result = (await getTool('mail_compose').handler(makeContext(), {
		action: 'send',
		input: { to: [{ address: 'bob@example.com' }], subject: 'Hi', textPlain: 'Hello' },
	})) as EmailToolResult;
	assert.equal(result.outcome, 'success');
	assert.equal(result.entities[0]?.id, '<sent@local>');
});

test('mail_compose: reply delegates to write.reply', async () => {
	let replyArgs: { f: string; u: number } | undefined;
	const ctx = makeContext({
		write: {
			...makeContext().write,
			reply: async (f, u) => {
				replyArgs = { f, u };
				return { messageId: '<r@local>' };
			},
		},
	});
	const result = (await getTool('mail_compose').handler(ctx, {
		action: 'reply',
		folder: 'INBOX',
		uid: 42,
		input: { text: 'Thanks' },
	})) as EmailToolResult;
	assert.equal(result.outcome, 'success');
	assert.equal(replyArgs?.f, 'INBOX');
	assert.equal(replyArgs?.u, 42);
});

test('mail_compose: forward delegates to write.forward', async () => {
	const result = (await getTool('mail_compose').handler(makeContext(), {
		action: 'forward',
		folder: 'INBOX',
		uid: 42,
		input: { to: [{ address: 'carol@example.com' }] },
	})) as EmailToolResult;
	assert.equal(result.outcome, 'success');
	assert.match(result.summary, /forward/i);
});

test('mail_compose: save_draft returns uid and next step', async () => {
	const result = (await getTool('mail_compose').handler(makeContext(), {
		action: 'save_draft',
		input: { subject: 'Draft', textPlain: 'wip' },
	})) as EmailToolResult;
	assert.equal(result.outcome, 'success');
	assert.match(result.summary, /10/);
	assert.ok(result.nextSteps.some((s) => s.includes('send_draft')));
});

test('mail_compose: update_draft returns new uid', async () => {
	const result = (await getTool('mail_compose').handler(makeContext(), {
		action: 'update_draft',
		uid: 10,
		input: { subject: 'Updated', textPlain: 'updated' },
	})) as EmailToolResult;
	assert.equal(result.outcome, 'success');
	assert.match(result.summary, /11/);
});

test('mail_compose: send_draft sends the draft', async () => {
	const result = (await getTool('mail_compose').handler(makeContext(), {
		action: 'send_draft',
		uid: 10,
	})) as EmailToolResult;
	assert.equal(result.outcome, 'success');
	assert.match(result.summary, /draft-sent/);
});

test('mail_compose: returns error outcome when send throws', async () => {
	const ctx = makeContext({
		write: {
			...makeContext().write,
			send: async () => {
				throw new Error('SMTP failed');
			},
		},
	});
	const result = (await getTool('mail_compose').handler(ctx, {
		action: 'send',
		input: { to: [{ address: 'x@y.com' }], subject: 'fail', textPlain: 'body' },
	})) as EmailToolResult;
	assert.equal(result.outcome, 'error');
	assert.match(result.summary, /SMTP failed/);
});

// ─── mail_organize ────────────────────────────────────────────────────────────

for (const action of ['mark_read', 'mark_unread', 'star', 'unstar', 'mark_answered']) {
	test(`mail_organize: ${action} succeeds`, async () => {
		const result = (await getTool('mail_organize').handler(makeContext(), {
			action,
			folder: 'INBOX',
			uids: [42, 43],
		})) as EmailToolResult;
		assert.equal(result.outcome, 'success');
		assert.equal(result.entities.length, 2);
		assert.equal(result.entities[0]?.kind, 'message');
	});
}

test('mail_organize: copy delegates to write.copyTo with destination', async () => {
	let calledDest = '';
	const ctx = makeContext({
		write: {
			...makeContext().write,
			copyTo: async (_f, _u, dest) => {
				calledDest = dest;
			},
		},
	});
	const result = (await getTool('mail_organize').handler(ctx, {
		action: 'copy',
		folder: 'INBOX',
		uids: [42],
		destination: 'Archive',
	})) as EmailToolResult;
	assert.equal(result.outcome, 'success');
	assert.equal(calledDest, 'Archive');
	assert.match(result.summary, /Archive/);
});

test('mail_organize: move delegates to write.moveTo', async () => {
	const result = (await getTool('mail_organize').handler(makeContext(), {
		action: 'move',
		folder: 'INBOX',
		uids: [42],
		destination: 'Trash',
	})) as EmailToolResult;
	assert.equal(result.outcome, 'success');
	assert.match(result.summary, /Trash/);
});

test('mail_organize: archive, trash, junk each succeed', async () => {
	for (const action of ['archive', 'trash', 'junk']) {
		const result = (await getTool('mail_organize').handler(makeContext(), {
			action,
			folder: 'INBOX',
			uids: [42],
		})) as EmailToolResult;
		assert.equal(result.outcome, 'success', `${action} should succeed`);
	}
});

test('mail_organize: not_junk passes destination to markNotJunk', async () => {
	let receivedDest: string | undefined;
	const ctx = makeContext({
		write: {
			...makeContext().write,
			markNotJunk: async (_f, _u, d) => {
				receivedDest = d;
			},
		},
	});
	const result = (await getTool('mail_organize').handler(ctx, {
		action: 'not_junk',
		folder: 'Junk',
		uids: [42],
		destination: 'INBOX',
	})) as EmailToolResult;
	assert.equal(result.outcome, 'success');
	assert.equal(receivedDest, 'INBOX');
});

test('mail_organize: not_junk without destination passes undefined', async () => {
	let receivedDest: string | undefined = 'preset';
	const ctx = makeContext({
		write: {
			...makeContext().write,
			markNotJunk: async (_f, _u, d) => {
				receivedDest = d;
			},
		},
	});
	await getTool('mail_organize').handler(ctx, { action: 'not_junk', folder: 'Junk', uids: [42] });
	assert.equal(receivedDest, undefined);
});

test('mail_organize: set_labels passes labels array', async () => {
	let receivedLabels: string[] = [];
	const ctx = makeContext({
		write: {
			...makeContext().write,
			setLabels: async (_f, _u, l) => {
				receivedLabels = l;
			},
		},
	});
	await getTool('mail_organize').handler(ctx, {
		action: 'set_labels',
		folder: 'INBOX',
		uids: [42],
		labels: ['important', 'work'],
	});
	assert.deepEqual(receivedLabels, ['important', 'work']);
});

test('mail_organize: add_labels and remove_labels both succeed', async () => {
	const r1 = (await getTool('mail_organize').handler(makeContext(), {
		action: 'add_labels',
		folder: 'INBOX',
		uids: [42],
		labels: ['receipts'],
	})) as EmailToolResult;
	assert.equal(r1.outcome, 'success');
	const r2 = (await getTool('mail_organize').handler(makeContext(), {
		action: 'remove_labels',
		folder: 'INBOX',
		uids: [42],
		labels: ['receipts'],
	})) as EmailToolResult;
	assert.equal(r2.outcome, 'success');
});

test('mail_organize: create_folder succeeds with nextStep hint', async () => {
	const result = (await getTool('mail_organize').handler(makeContext(), {
		action: 'create_folder',
		path: 'Projects',
	})) as EmailToolResult;
	assert.equal(result.outcome, 'success');
	assert.match(result.summary, /Projects/);
	assert.ok(result.nextSteps.some((s) => s.includes('refresh_folders')));
});

test('mail_organize: rename_folder reports old and new path', async () => {
	const result = (await getTool('mail_organize').handler(makeContext(), {
		action: 'rename_folder',
		oldPath: 'Projects',
		newPath: 'Archive/Projects',
	})) as EmailToolResult;
	assert.equal(result.outcome, 'success');
	assert.match(result.summary, /renamed/i);
});

test('mail_organize: delete_folder, subscribe_folder, unsubscribe_folder all succeed', async () => {
	for (const [action, path] of [
		['delete_folder', 'Old'],
		['subscribe_folder', 'Updates'],
		['unsubscribe_folder', 'Updates'],
	]) {
		const result = (await getTool('mail_organize').handler(makeContext(), {
			action,
			path,
		})) as EmailToolResult;
		assert.equal(result.outcome, 'success', `${action} should succeed`);
	}
});

test('mail_organize: returns error outcome on write failure', async () => {
	const ctx = makeContext({
		write: {
			...makeContext().write,
			markRead: async () => {
				throw new Error('Server NO');
			},
		},
	});
	const result = (await getTool('mail_organize').handler(ctx, {
		action: 'mark_read',
		folder: 'INBOX',
		uids: [42],
	})) as EmailToolResult;
	assert.equal(result.outcome, 'error');
	assert.match(result.summary, /Server NO/);
});

// ─── mail_sync ────────────────────────────────────────────────────────────────

test('mail_sync: connect calls network.connect', async () => {
	let called = false;
	const ctx = makeContext({
		network: {
			...makeContext().network,
			connect: async () => {
				called = true;
			},
		},
	});
	const result = (await getTool('mail_sync').handler(ctx, {
		action: 'connect',
	})) as EmailToolResult;
	assert.ok(called);
	assert.equal(result.outcome, 'success');
	assert.match(result.summary, /Connected/i);
});

test('mail_sync: disconnect calls network.disconnect', async () => {
	let called = false;
	const ctx = makeContext({
		network: {
			...makeContext().network,
			disconnect: async () => {
				called = true;
			},
		},
	});
	const result = (await getTool('mail_sync').handler(ctx, {
		action: 'disconnect',
	})) as EmailToolResult;
	assert.ok(called);
	assert.equal(result.outcome, 'success');
});

test('mail_sync: reconnect calls network.reconnect', async () => {
	let called = false;
	const ctx = makeContext({
		network: {
			...makeContext().network,
			reconnect: async () => {
				called = true;
			},
		},
	});
	const result = (await getTool('mail_sync').handler(ctx, {
		action: 'reconnect',
	})) as EmailToolResult;
	assert.ok(called);
	assert.match(result.summary, /reconnect/i);
});

test('mail_sync: sync returns counts from SyncResult', async () => {
	const result = (await getTool('mail_sync').handler(makeContext(), {
		action: 'sync',
	})) as EmailToolResult;
	assert.equal(result.outcome, 'success');
	assert.match(result.summary, /3 new/);
	assert.equal(result.entities[0]?.kind, 'mailbox');
});

test('mail_sync: sync passes bodies and folders options to network.sync', async () => {
	let receivedOpts: unknown;
	const ctx = makeContext({
		network: {
			...makeContext().network,
			sync: async (o) => {
				receivedOpts = o;
				return { folders: [], totalNew: 0, totalExpunged: 0 };
			},
		},
	});
	await getTool('mail_sync').handler(ctx, { action: 'sync', bodies: 'all', folders: ['INBOX'] });
	assert.deepEqual(receivedOpts, { folders: ['INBOX'], bodies: 'all' });
});

test('mail_sync: sync defaults bodies to missing', async () => {
	let receivedOpts: unknown;
	const ctx = makeContext({
		network: {
			...makeContext().network,
			sync: async (o) => {
				receivedOpts = o;
				return { folders: [], totalNew: 0, totalExpunged: 0 };
			},
		},
	});
	await getTool('mail_sync').handler(ctx, { action: 'sync' });
	assert.deepEqual(receivedOpts, { bodies: 'missing' });
});

test('mail_sync: refresh_folders returns folder entities', async () => {
	const result = (await getTool('mail_sync').handler(makeContext(), {
		action: 'refresh_folders',
	})) as EmailToolResult;
	assert.equal(result.outcome, 'success');
	assert.equal(result.entities[0]?.kind, 'mailbox');
	assert.match(result.summary, /folder/i);
});

test('mail_sync: watch syncs and advises application-layer watch', async () => {
	const result = (await getTool('mail_sync').handler(makeContext(), {
		action: 'watch',
		folders: ['INBOX'],
	})) as EmailToolResult;
	assert.equal(result.outcome, 'success');
	assert.match(result.summary, /watch/i);
	assert.ok(result.nextSteps.some((s) => s.includes('watch()')));
});

test('mail_sync: returns error outcome on connect failure', async () => {
	const ctx = makeContext({
		network: {
			...makeContext().network,
			connect: async () => {
				throw new Error('Connection refused');
			},
		},
	});
	const result = (await getTool('mail_sync').handler(ctx, {
		action: 'connect',
	})) as EmailToolResult;
	assert.equal(result.outcome, 'error');
	assert.match(result.summary, /Connection refused/);
});

// ─── Registry ─────────────────────────────────────────────────────────────────

test('emailTools exports exactly 5 CONCEPT tools in correct order', () => {
	assert.equal(emailTools.length, 5);
	const names = emailTools.map((t) => t.name);
	assert.deepEqual(names, [
		'mail_read',
		'mail_search',
		'mail_compose',
		'mail_organize',
		'mail_sync',
	]);
});

test('all tools have required metadata fields', () => {
	for (const tool of emailTools) {
		assert.ok(tool.name.length > 0, `${tool.name}: missing name`);
		assert.ok(tool.description.length > 0, `${tool.name}: missing description`);
		assert.ok(
			['read', 'write', 'external', 'none'].includes(tool.sideEffects),
			`${tool.name}: invalid sideEffects`,
		);
		assert.equal(tool.inputSchema.type, 'object', `${tool.name}: inputSchema must be object`);
		assert.equal(typeof tool.handler, 'function', `${tool.name}: handler must be a function`);
	}
});
