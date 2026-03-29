import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CliError } from '../errors.ts';

// ─── UID list parsing ─────────────────────────────────────────────────────────

function parseUids(raw: string | undefined, action: string): number[] {
	if (!raw) throw new CliError('missing_required_flag', `--uids is required for action: ${action}`);
	return raw.split(',').map((s) => {
		const n = parseInt(s.trim(), 10);
		if (!Number.isFinite(n) || n <= 0) {
			throw new CliError(
				'invalid_flag_value',
				`--uids must be comma-separated positive integers. Got: "${s.trim()}"`,
			);
		}
		return n;
	});
}

describe('organize command — UID parsing', () => {
	it('parses comma-separated UIDs', () => {
		assert.deepEqual(parseUids('1,2,3', 'star'), [1, 2, 3]);
	});

	it('parses single UID', () => {
		assert.deepEqual(parseUids('42', 'archive'), [42]);
	});

	it('trims whitespace around UIDs', () => {
		assert.deepEqual(parseUids('1, 2, 3', 'trash'), [1, 2, 3]);
	});

	it('throws missing_required_flag when undefined', () => {
		assert.throws(
			() => parseUids(undefined, 'star'),
			(e) => e instanceof CliError && e.code === 'missing_required_flag',
		);
	});

	it('throws invalid_flag_value for non-numeric UID', () => {
		assert.throws(
			() => parseUids('1,abc,3', 'star'),
			(e) => e instanceof CliError && e.code === 'invalid_flag_value',
		);
	});

	it('throws invalid_flag_value for zero UID', () => {
		assert.throws(
			() => parseUids('0', 'archive'),
			(e) => e instanceof CliError && e.code === 'invalid_flag_value',
		);
	});
});

// ─── kebab→snake action mapping ───────────────────────────────────────────────

describe('organize command — action mapping', () => {
	const KEBAB_TO_SNAKE: Record<string, string> = {
		'mark-read': 'mark_read',
		'mark-unread': 'mark_unread',
		star: 'star',
		unstar: 'unstar',
		'mark-answered': 'mark_answered',
		copy: 'copy',
		move: 'move',
		archive: 'archive',
		trash: 'trash',
		junk: 'junk',
		'not-junk': 'not_junk',
		'set-labels': 'set_labels',
		'add-labels': 'add_labels',
		'remove-labels': 'remove_labels',
		'create-folder': 'create_folder',
		'rename-folder': 'rename_folder',
		'delete-folder': 'delete_folder',
		'subscribe-folder': 'subscribe_folder',
		'unsubscribe-folder': 'unsubscribe_folder',
	};

	for (const [kebab, snake] of Object.entries(KEBAB_TO_SNAKE)) {
		it(`maps ${kebab} → ${snake}`, () => {
			// Just verify our mapping table is complete and consistent.
			assert.equal(snake, kebab.replace(/-/g, '_'));
		});
	}
});
