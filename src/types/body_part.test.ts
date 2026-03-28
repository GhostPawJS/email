import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { BodyPart } from './body_part.ts';

describe('BodyPart', () => {
	it('constructs nested multipart with partPath', () => {
		const alt: BodyPart = {
			type: 'multipart',
			subtype: 'alternative',
			params: { boundary: 'b' },
			id: null,
			description: null,
			encoding: '7bit',
			size: 0,
			partPath: '1',
			children: [
				{
					type: 'text',
					subtype: 'plain',
					params: { charset: 'utf-8' },
					id: null,
					description: null,
					encoding: '7bit',
					size: 10,
					lines: 1,
					partPath: '1.1',
				},
				{
					type: 'text',
					subtype: 'html',
					params: { charset: 'utf-8' },
					id: null,
					description: null,
					encoding: 'quoted-printable',
					size: 20,
					lines: 1,
					partPath: '1.2',
				},
			],
		};
		assert.equal(alt.partPath, '1');
		assert.equal(alt.children?.[0]?.partPath, '1.1');
		assert.equal(alt.children?.[1]?.partPath, '1.2');
	});
});
