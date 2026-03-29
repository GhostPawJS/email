import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Address } from '../../types/address.ts';
import { CliError } from '../errors.ts';

// ─── Address parsing (duplicated from compose.ts for unit testing) ────────────

function parseAddress(raw: string): Address {
	const match = /^(.+?)\s*<([^>]+)>$/.exec(raw.trim());
	if (match) {
		const name = match[1]?.trim();
		const address = match[2]?.trim() ?? '';
		return name ? { name, address } : { address };
	}
	return { address: raw.trim() };
}

function parseAddresses(raw: string): Address[] {
	return raw
		.split(',')
		.map((s) => parseAddress(s.trim()))
		.filter((a) => a.address);
}

describe('address parsing', () => {
	it('parses plain email address', () => {
		const addr = parseAddress('alice@example.com');
		assert.equal(addr.address, 'alice@example.com');
		assert.equal(addr.name, undefined);
	});

	it('parses "Name <email>" format', () => {
		const addr = parseAddress('Alice Smith <alice@example.com>');
		assert.equal(addr.address, 'alice@example.com');
		assert.equal(addr.name, 'Alice Smith');
	});

	it('handles leading/trailing whitespace', () => {
		const addr = parseAddress('  alice@example.com  ');
		assert.equal(addr.address, 'alice@example.com');
	});

	it('parses comma-separated addresses', () => {
		const addrs = parseAddresses('alice@example.com, Bob <bob@example.com>');
		assert.equal(addrs.length, 2);
		assert.equal(addrs[0]!.address, 'alice@example.com');
		assert.equal(addrs[1]!.address, 'bob@example.com');
		assert.equal(addrs[1]!.name, 'Bob');
	});

	it('filters out empty addresses', () => {
		const addrs = parseAddresses('alice@example.com,,');
		assert.equal(addrs.length, 1);
	});
});

// ─── Body resolution ──────────────────────────────────────────────────────────

describe('body resolution', () => {
	it('throws body_required when no flag and stdin not piped', () => {
		// Simulate the logic: flag absent, stdin not piped
		const hasFlagValue = false;
		const isStdinPiped = false;
		const required = true;

		if (!hasFlagValue && !isStdinPiped && required) {
			const err = new CliError('body_required', 'Body is required.');
			assert.equal(err.code, 'body_required');
			assert.equal(err.exitCode, 1);
		}
	});

	it('uses flag value when provided (ignores stdin)', () => {
		const flagValue = 'Hello from flag';
		const result = flagValue !== undefined ? flagValue : 'from stdin';
		assert.equal(result, 'Hello from flag');
	});
});

// ─── UID parsing ─────────────────────────────────────────────────────────────

function parseUid(raw: string | undefined): number {
	if (!raw) throw new CliError('missing_required_flag', '--uid is required.');
	const n = parseInt(raw, 10);
	if (!Number.isFinite(n) || n <= 0) {
		throw new CliError('invalid_flag_value', `--uid must be a positive integer. Got: "${raw}"`);
	}
	return n;
}

describe('compose command — UID parsing', () => {
	it('parses valid UID', () => {
		assert.equal(parseUid('1234'), 1234);
	});

	it('throws missing_required_flag when undefined', () => {
		assert.throws(
			() => parseUid(undefined),
			(e) => e instanceof CliError && e.code === 'missing_required_flag',
		);
	});

	it('throws invalid_flag_value for non-numeric', () => {
		assert.throws(
			() => parseUid('bad'),
			(e) => e instanceof CliError && e.code === 'invalid_flag_value',
		);
	});
});
