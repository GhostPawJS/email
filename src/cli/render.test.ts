import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EmailToolResult } from '../tools/tool_types.ts';
import { renderResult } from './render.ts';

function captureStdout(fn: () => void): string {
	const chunks: string[] = [];
	const original = process.stdout.write.bind(process.stdout);
	process.stdout.write = (chunk: unknown) => {
		chunks.push(String(chunk));
		return true;
	};
	try {
		fn();
	} finally {
		process.stdout.write = original;
	}
	return chunks.join('');
}

const successResult: EmailToolResult = {
	outcome: 'success',
	summary: '3 message(s) in INBOX.',
	entities: [
		{ kind: 'message', id: '1', title: 'Hello world' },
		{ kind: 'message', id: '2', title: 'Another one' },
	],
	nextSteps: ['Use view: "message" to read a specific message.'],
};

describe('renderResult', () => {
	it('prints JSON when opts.json is true', () => {
		const out = captureStdout(() => renderResult(successResult, { json: true, quiet: false }));
		const parsed = JSON.parse(out) as EmailToolResult;
		assert.equal(parsed.outcome, 'success');
		assert.equal(parsed.summary, '3 message(s) in INBOX.');
	});

	it('produces no output when opts.quiet is true', () => {
		const out = captureStdout(() => renderResult(successResult, { json: false, quiet: true }));
		assert.equal(out, '');
	});

	it('prints summary for success result', () => {
		const out = captureStdout(() => renderResult(successResult, { json: false, quiet: false }));
		assert.ok(out.includes('3 message(s) in INBOX.'));
	});

	it('prints entity titles', () => {
		const out = captureStdout(() => renderResult(successResult, { json: false, quiet: false }));
		assert.ok(out.includes('Hello world'));
		assert.ok(out.includes('Another one'));
	});

	it('prints first nextSteps hint', () => {
		const out = captureStdout(() => renderResult(successResult, { json: false, quiet: false }));
		assert.ok(out.includes('Use view: "message" to read a specific message.'));
	});

	it('produces no entity table when entities is empty', () => {
		const result: EmailToolResult = { ...successResult, entities: [] };
		const out = captureStdout(() => renderResult(result, { json: false, quiet: false }));
		assert.ok(out.includes('3 message(s) in INBOX.'));
		// No entity kind label
		assert.ok(!out.includes('message '));
	});

	it('produces no hint when nextSteps is empty', () => {
		const result: EmailToolResult = { ...successResult, nextSteps: [] };
		const out = captureStdout(() => renderResult(result, { json: false, quiet: false }));
		assert.ok(!out.includes('→'));
	});

	it('--json takes precedence over --quiet', () => {
		const out = captureStdout(() => renderResult(successResult, { json: true, quiet: true }));
		assert.ok(out.includes('"outcome"'));
	});
});
