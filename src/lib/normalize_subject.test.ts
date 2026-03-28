import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeSubject } from './normalize_subject.ts';

describe('normalizeSubject', () => {
	it('strips Re and Fwd chains', () => {
		assert.equal(normalizeSubject('Re: Re: Fwd: [ML] Hello'), 'Hello');
	});
});
