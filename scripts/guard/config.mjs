import assert from 'node:assert/strict';
export const packageName = '@ghostpaw/email';
export const publicEntries = ['.', './mcp'];
export const binName = 'ghostpaw-email';
export const extraFiles = ['SKILL.md', 'skills/email/SKILL.md', 'skills/email/references/cli.md'];
export const entries = {
	full: `export * from './dist/index.js';`,
	tools: `import {tools} from './dist/index.js'; export const registry = tools.aligned.emailTools;`,
	'read-write': `export {read, write} from './dist/index.js';`,
	mcp: `export * from './dist/mcp.js';`,
	cli: { entryPoints: ['dist/cli.js'] },
	'mcp-server': { entryPoints: ['dist/mcp-server.js'] },
};
export const search = { query: 'jasmine' };
export const modernMeta = {
	'io.modelcontextprotocol/protocolVersion': '2026-07-28',
	'io.modelcontextprotocol/clientCapabilities': {},
};
export const discover = {
	jsonrpc: '2.0',
	id: 4,
	method: 'server/discover',
	params: { _meta: modernMeta },
};
export const searchRequest = {
	jsonrpc: '2.0',
	id: 5,
	method: 'tools/call',
	params: { name: 'mail_search', arguments: search, _meta: modernMeta },
};
export const legacyRequests = [
	{
		jsonrpc: '2.0',
		id: 1,
		method: 'initialize',
		params: {
			protocolVersion: '2025-11-25',
			capabilities: {},
			clientInfo: { name: 'guard', version: '1' },
		},
	},
	{ jsonrpc: '2.0', id: 2, method: 'tools/list' },
	{
		jsonrpc: '2.0',
		id: 3,
		method: 'tools/call',
		params: { name: 'mail_search', arguments: search },
	},
];
// The email write tools require IMAP. CLI smoke checks use the offline read paths;
// smokeLibrary below exercises a cache write and a real aligned search tool.
export const cliRemember = ['call', 'mail_read', JSON.stringify({ view: 'folders' })];
export const cliSearch = ['call', 'mail_search', JSON.stringify(search)];
export function assertApi(root, mcp) {
	for (const key of ['initSchema', 'read', 'write', 'tools', 'store']) assert.ok(root[key], key);
	assert.equal(typeof mcp.createEmailMcpServer, 'function');
}
export function seedClaim(i, random = () => 0) {
	return {
		uid: i + 1,
		messageId: `<bench-${i}@example.com>`,
		inReplyTo: null,
		references: [],
		threadId: null,
		subject: `Jasmine tea planning ${i} ${Math.floor(random() * 100)}`,
		from: { address: 'reader@example.com' },
		to: [{ address: 'team@example.com' }],
		cc: [],
		bcc: [],
		replyTo: null,
		date: '2026-01-01T00:00:00Z',
		receivedAt: '2026-01-01T00:00:00Z',
		envelopeFrom: null,
		envelopeTo: [],
		flags: [],
		labels: [],
		size: 100,
		bodyStructure: null,
		hasAttachments: false,
		modSeq: null,
	};
}
export function seed(api, db, count = 10000, random) {
	api.initSchema(db);
	const account = api.store.upsertAccount(db, {
		host: 'imap.example.com',
		port: 993,
		username: 'reader@example.com',
	});
	const folder = api.store.upsertFolder(db, { accountId: account.id, path: 'INBOX' });
	db.exec('BEGIN');
	try {
		for (let i = 0; i < count; i++)
			api.store.insertMessage(db, { ...seedClaim(i, random), folderId: folder.id });
		db.exec('COMMIT');
	} catch (error) {
		db.exec('ROLLBACK');
		throw error;
	}
	return { account, folder };
}
export async function smokeLibrary(api, db) {
	const { account } = seed(api, db, 1);
	const result = await api.tools.aligned
		.getEmailToolByName('mail_search')
		.handler({ read: api.read.createReadSurface(db, account.id) }, search);
	assert.equal(result.ok, true);
	assert.equal(result.data.entities[0].title.startsWith('Jasmine tea'), true);
}
export const typeConsumer = `import {DatabaseSync} from 'node:sqlite';
import {initSchema, read, store} from '${packageName}';
import {createEmailMcpServer} from '${packageName}/mcp';
const db = new DatabaseSync(':memory:'); initSchema(db);
store.upsertAccount(db, {host: 'example.com', port: 993, username: 'reader'});
read.createReadSurface(db, 1).folders(); createEmailMcpServer({db});`;
export function createServer(mcp, db) {
	return mcp.createEmailMcpServer({ db });
}
export function hotPaths(api, db, server) {
	const read = api.read.createReadSurface(db, 1);
	return {
		'store.insertMessage': (i) =>
			api.store.insertMessage(db, { ...seedClaim(i + 10000), folderId: 1 }),
		'read.search': () => read.search(search.query),
		mail_search: () =>
			api.tools.aligned.getEmailToolByName('mail_search').handler({ read }, search),
		mail_read: () =>
			api.tools.aligned.getEmailToolByName('mail_read').handler({ read }, { view: 'folders' }),
		'MCP tools/call': () => server.handleLine(JSON.stringify(searchRequest)),
	};
}
export function consumerSmoke(configUrl) {
	return `import {createRequire} from 'node:module'; import {DatabaseSync} from 'node:sqlite';
 import {assertApi,smokeLibrary} from ${JSON.stringify(configUrl)};
 const require = createRequire(import.meta.url);
 const root = await import(${JSON.stringify(packageName)}); const mcp = await import(${JSON.stringify(`${packageName}/mcp`)});
 assertApi(root,mcp); assertApi(require(${JSON.stringify(packageName)}),require(${JSON.stringify(`${packageName}/mcp`)}));
 const db = new DatabaseSync(':memory:'); try {await smokeLibrary(root,db);} finally {db.close();}`;
}
export function assertRoundTrip(read, searched) {
	assert.equal(read.ok, true);
	assert.equal(searched.ok, true);
	assert.deepEqual(searched.data.entities, []);
}
export function assertMcpReplies(replies) {
	assert.ok(replies[1].result.tools.some((tool) => tool.name === 'mail_search'));
	assert.equal(replies[2].result.structuredContent.ok, true);
	assert.equal(replies[3].result.resultType, 'complete');
}
