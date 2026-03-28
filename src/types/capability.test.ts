import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { NegotiatedExtensions, SelectedFolder } from './capability.ts';

describe('capability types', () => {
	it('constructs SelectedFolder and NegotiatedExtensions', () => {
		const s: SelectedFolder = {
			exists: 10,
			recent: 0,
			flags: [],
			permanentFlags: [],
			uidValidity: 1,
			uidNext: 100,
			highestModSeq: null,
		};
		const allTrue: NegotiatedExtensions = {
			condstore: true,
			qresync: true,
			move: true,
			uidplus: true,
			compress: true,
			idle: true,
			sort: true,
			thread: true,
			specialUse: true,
			namespace: true,
			id: true,
			quota: true,
			literalPlus: true,
			esearch: true,
			listStatus: true,
			binary: true,
			unselect: true,
			appendLimit: 1000,
		};
		const allFalse: NegotiatedExtensions = {
			condstore: false,
			qresync: false,
			move: false,
			uidplus: false,
			compress: false,
			idle: false,
			sort: false,
			thread: false,
			specialUse: false,
			namespace: false,
			id: false,
			quota: false,
			literalPlus: false,
			esearch: false,
			listStatus: false,
			binary: false,
			unselect: false,
			appendLimit: null,
		};
		assert.equal(s.uidNext, 100);
		assert.equal(allTrue.condstore, true);
		assert.equal(allFalse.condstore, false);
	});
});
