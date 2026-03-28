import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveNow } from './resolve_now.ts';

test('resolveNow returns the provided timestamp', () => {
	assert.equal(resolveNow(123), 123);
});
