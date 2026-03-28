import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type {
	ContinuationResponse,
	ImapResponse,
	TaggedResponse,
	UntaggedResponse,
} from './imap_response.ts';

describe('ImapResponse', () => {
	it('discriminates tagged, untagged, continuation', () => {
		const t: TaggedResponse = {
			kind: 'tagged',
			tag: 'A001',
			status: 'OK',
			code: null,
			text: 'OK',
		};
		const u: UntaggedResponse = {
			kind: 'untagged',
			type: 'FETCH',
			number: 1,
			data: {},
			code: null,
		};
		const c: ContinuationResponse = { kind: 'continuation', text: 'go' };
		const responses: ImapResponse[] = [t, u, c];
		assert.equal(responses[0]?.kind, 'tagged');
		assert.equal(responses[1]?.kind, 'untagged');
		assert.equal(responses[2]?.kind, 'continuation');
	});
});
