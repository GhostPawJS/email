// Smoke test for a built SEA binary: version, a local SQLite search, and an
// MCP initialize + tools/list round trip over stdio.
//   node scripts/sea/smoke.mjs [path-to-binary]   (default: this host's build in dist-sea/)
import { spawnSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const host = `${process.platform === 'win32' ? 'windows' : process.platform}-${process.arch}`;
const binary = resolve(
	process.argv[2] ?? `dist-sea/${host}/ghostpaw-email${process.platform === 'win32' ? '.exe' : ''}`,
);
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const dir = mkdtempSync(join(tmpdir(), 'sea-smoke-'));
const db = join(dir, 'email.db');
const fail = (message) => {
	console.error(`smoke: ${message}`);
	process.exit(1);
};
// File-backed stdio also works where child-process pipes are restricted.
const run = (args, input = '') => {
	const paths = ['stdin', 'stdout', 'stderr'].map((name) => join(dir, name));
	for (const path of paths) writeFileSync(path, '');
	writeFileSync(paths[0], input);
	const fds = paths.map((path, i) => openSync(path, i === 0 ? 'r' : 'w'));
	let result;
	try {
		result = spawnSync(binary, args, { stdio: fds, timeout: 15000 });
	} finally {
		for (const fd of fds) closeSync(fd);
	}
	const err = readFileSync(paths[2], 'utf8');
	if (result.error) fail(result.error.message);
	if (result.status !== 0) fail(`${args.join(' ')} exited ${result.status}: ${err}`);
	if (err.trim()) fail(`${args.join(' ')} wrote to stderr: ${err}`);
	return readFileSync(paths[1], 'utf8');
};

const version = run(['--version']).trim();
const expectedVersion = `email ${pkg.version} (binary, ${process.platform === 'win32' ? 'windows' : process.platform}-${process.arch})`;
if (version !== expectedVersion) fail(`--version printed ${version}, expected ${expectedVersion}`);
run(['--help']);
// Email writes require credentials; search exercises local SQLite offline.
const read = JSON.parse(run(['mail', 'search', 'smoke', '--db', db, '--json']));
if (!read.ok) fail('local search failed');
if (JSON.parse(run(['tools', '--json'])).length !== 5) fail('tool list failed');

const requests = [
	{
		jsonrpc: '2.0',
		id: 1,
		method: 'initialize',
		params: {
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: { name: 'smoke', version: '0' },
		},
	},
	{ jsonrpc: '2.0', method: 'notifications/initialized' },
	{ jsonrpc: '2.0', id: 2, method: 'tools/list' },
];
const replies = run(['mcp', '--db', db], `${requests.map((r) => JSON.stringify(r)).join('\n')}\n`)
	.trim()
	.split('\n')
	.map((line) => JSON.parse(line));
if (!replies.find((r) => r.id === 1)?.result?.serverInfo) fail('missing initialize response');
const tools = replies.find((r) => r.id === 2)?.result?.tools ?? [];
if (tools.length !== 5 || !tools.some((tool) => tool.name === 'mail_search'))
	fail('unexpected MCP tools');
rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
console.log(`smoke ok: ${binary} ${version}, local sqlite search, mcp ${tools.length} tools`);
