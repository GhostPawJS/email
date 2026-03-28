import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { htmlToText } from './html_to_text.ts';

describe('htmlToText', () => {
	it('strips tags and decodes entities', () => {
		const t = htmlToText('<p>Hi &amp; &lt;b&gt;</p>');
		assert.ok(t.includes('Hi'));
		assert.ok(t.includes('&'));
	});
});
