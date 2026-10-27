import { spawnSync } from 'node:child_process';
// Cold-start benchmark for the SEA binary. Usage:
//   node scripts/sea/bench.mjs <label>=<command...> [more]   (command split on spaces)
// Prints median and p90 in ms over RUNS (default 21) for: --version, --help,
// local mail search against an empty cache, and
// mcp initialize + tools/list, plus mcp initialize + a first search call.

import { closeSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { run } from '../guard/process.mjs';

const RUNS = Number(process.env.RUNS ?? 21);
const stats = (xs) => {
	const s = [...xs].sort((a, b) => a - b);
	return { median: s[Math.floor(s.length / 2)], p90: s[Math.floor(s.length * 0.9)] };
};
const time = (cmd, args) => {
	const t = performance.now();
	run(cmd, args);
	const ms = performance.now() - t;
	return ms;
};
const mcp = async (cmd, args, lines, waitForId) => {
	const dir = mkdtempSync(join(tmpdir(), 'sea-mcp-bench-'));
	const paths = ['input', 'output', 'error'].map((name) => join(dir, name));
	writeFileSync(paths[0], `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`);
	const fds = paths.map((path, i) => openSync(path, i === 0 ? 'r' : 'w'));
	try {
		const start = performance.now();
		const result = spawnSync(cmd, args, { stdio: fds, timeout: 15000 });
		const ms = performance.now() - start;
		if (result.error) throw result.error;
		const error = readFileSync(paths[2], 'utf8');
		if (result.status !== 0 || error.trim())
			throw new Error(`MCP exited ${result.status}: ${error}`);
		const replies = readFileSync(paths[1], 'utf8')
			.trim()
			.split('\n')
			.map((line) => JSON.parse(line));
		const reply = replies.find((reply) => reply.id === waitForId);
		if (!reply?.result || reply.result.isError) throw new Error('Missing successful MCP response');
		return ms;
	} finally {
		for (const fd of fds) closeSync(fd);
		rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
	}
};
const init = [
	{
		jsonrpc: '2.0',
		id: 1,
		method: 'initialize',
		params: {
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: { name: 'bench', version: '0' },
		},
	},
	{ jsonrpc: '2.0', method: 'notifications/initialized' },
];
const results = {};
for (const spec of process.argv.slice(2)) {
	const eq = spec.indexOf('=');
	const label = spec.slice(0, eq);
	const [cmd, ...pre] = spec.slice(eq + 1).split(' ');
	const dir = mkdtempSync(join(tmpdir(), 'seabench-'));
	const db = join(dir, 'email.db');
	const s = { version: [], help: [], read: [], mcpList: [], mcpSearch: [] };
	time(cmd, [...pre, '--version']); // warm the page cache once
	for (let i = 0; i < RUNS; i++) {
		s.version.push(time(cmd, [...pre, '--version']));
		s.help.push(time(cmd, [...pre, '--help']));
		s.read.push(time(cmd, [...pre, '--db', db, 'mail', 'search', 'bench']));
		s.mcpList.push(
			await mcp(
				cmd,
				[...pre, 'mcp', '--db', db],
				[...init, { jsonrpc: '2.0', id: 2, method: 'tools/list' }],
				2,
			),
		);
		s.mcpSearch.push(
			await mcp(
				cmd,
				[...pre, 'mcp', '--db', db],
				[
					...init,
					{
						jsonrpc: '2.0',
						id: 3,
						method: 'tools/call',
						params: { name: 'mail_search', arguments: { query: 'bench' } },
					},
				],
				3,
			),
		);
	}
	rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
	results[label] = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, stats(v)]));
}
const keys = ['version', 'help', 'read', 'mcpList', 'mcpSearch'];
console.log(`| build | ${keys.join(' | ')} |`);
console.log(`|---|${keys.map(() => '---').join('|')}|`);
for (const [label, r] of Object.entries(results))
	console.log(
		`| ${label} | ${keys.map((k) => `${r[k].median.toFixed(1)} (p90 ${r[k].p90.toFixed(1)})`).join(' | ')} |`,
	);
