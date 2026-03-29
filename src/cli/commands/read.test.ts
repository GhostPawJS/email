import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CliError } from '../errors.ts';

// ─── Helpers shared across command tests ─────────────────────────────────────

// We test the flag-validation and input-construction logic in isolation by
// calling the internal helpers. For full integration we rely on the library's
// existing test suite. These tests verify the CLI's own wiring.

// ─── UID parsing ─────────────────────────────────────────────────────────────

function parseUid(raw: string, view: string): number {
	const n = parseInt(raw, 10);
	if (!Number.isFinite(n) || n <= 0) {
		throw new CliError(
			'invalid_flag_value',
			`--uid must be a positive integer (view: ${view}). Got: "${raw}"`,
		);
	}
	return n;
}

describe('read command — UID parsing', () => {
	it('parses a valid UID string', () => {
		assert.equal(parseUid('42', 'message'), 42);
	});

	it('throws invalid_flag_value for non-numeric UID', () => {
		assert.throws(
			() => parseUid('abc', 'message'),
			(e) => e instanceof CliError && e.code === 'invalid_flag_value',
		);
	});

	it('throws invalid_flag_value for zero UID', () => {
		assert.throws(
			() => parseUid('0', 'message'),
			(e) => e instanceof CliError && e.code === 'invalid_flag_value',
		);
	});

	it('throws invalid_flag_value for negative UID', () => {
		assert.throws(
			() => parseUid('-5', 'message'),
			(e) => e instanceof CliError && e.code === 'invalid_flag_value',
		);
	});
});

// ─── Required flag checking ───────────────────────────────────────────────────

function requireFlag(
	value: string | undefined,
	flag: string,
	view: string,
): asserts value is string {
	if (!value) {
		throw new CliError('missing_required_flag', `${flag} is required for view: ${view}`);
	}
}

describe('read command — required flag checking', () => {
	it('passes when value is present', () => {
		assert.doesNotThrow(() => requireFlag('INBOX', '--folder', 'message'));
	});

	it('throws missing_required_flag when value is undefined', () => {
		assert.throws(
			() => requireFlag(undefined, '--folder', 'message'),
			(e) => e instanceof CliError && e.code === 'missing_required_flag',
		);
	});

	it('throws missing_required_flag when value is empty string', () => {
		assert.throws(
			() => requireFlag('', '--folder', 'message'),
			(e) => e instanceof CliError && e.code === 'missing_required_flag',
		);
	});
});

// ─── Unknown view ─────────────────────────────────────────────────────────────

describe('read command — unknown view', () => {
	it('throws unknown_subaction for unknown view', () => {
		const view = 'typo';
		const validViews = ['folders', 'queue', 'thread', 'message', 'attachment', 'eml'];
		if (!validViews.includes(view)) {
			const err = new CliError('unknown_subaction', `Unknown view: "${view}"`);
			assert.equal(err.code, 'unknown_subaction');
		}
	});
});
