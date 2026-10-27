import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderSkillMarkdown, type SkillMarkdownSpec } from './skill_markdown.ts';

const spec: SkillMarkdownSpec<null> = {
	name: 'example',
	description: 'Manage records. Use when maintaining records.',
	bin: 'example',
	server: 'example',
	about: 'A record engine.',
	tools: [
		{
			name: 'find',
			description: 'Find records',
			whenToUse: 'searching',
			whenNotToUse: 'writing',
			readOnly: true,
			inputSchema: {
				type: 'object',
				required: ['mode'],
				properties: { mode: { type: 'string', enum: ['a', 'b'] } },
			},
			handler: () => null,
		},
	],
	workflows: [{ name: 'search', description: 'Search well' }],
	principles: ['Search first.'],
};
test('skill output has deterministic frontmatter, CLI, MCP and references', () => {
	const result = renderSkillMarkdown({ ...spec, metadata: { version: '1' }, license: 'MIT' });
	assert.equal(
		result,
		renderSkillMarkdown({ ...spec, metadata: { version: '1' }, license: 'MIT' }),
	);
	assert.ok(result.startsWith('---\nname: example\ndescription: '));
	for (const expected of [
		'MCP:',
		'example call <tool>',
		'references/search.md',
		'Read-only.',
		'| mode | string | yes | a, b.',
		'Search first.',
	])
		assert.ok(result.includes(expected), expected);
});
test('reject invalid skill metadata', () => {
	for (const name of ['UPPER', '-bad', 'a--b', 'a'.repeat(65)])
		assert.throws(() => renderSkillMarkdown({ ...spec, name }));
	for (const description of ['', 'x'.repeat(1025), 'Missing usage'])
		assert.throws(() => renderSkillMarkdown({ ...spec, description }));
});

test('reference base changes only workflow link targets', () => {
	assert.equal(
		renderSkillMarkdown(spec, { referencesBase: 'skills/example/references' }),
		renderSkillMarkdown(spec).replace(
			'(references/search.md)',
			'(skills/example/references/search.md)',
		),
	);
});

test('nested object alternatives inline fields and mark requirements within their parent', () => {
	const first = spec.tools[0];
	assert.ok(first);
	const markdown = renderSkillMarkdown({
		...spec,
		tools: [
			{
				...first,
				inputSchema: {
					type: 'object',
					properties: {
						parent: {
							oneOf: [
								{
									type: 'object',
									required: ['title'],
									properties: { title: { type: 'string', description: 'Record title.' } },
								},
								{
									type: 'object',
									properties: { mode: { type: 'string', enum: ['fast', 'slow'] } },
								},
							],
						},
					},
				},
			},
		],
	});
	assert.match(markdown, /\| parent.title \| string \| yes \| Record title/);
	assert.match(markdown, /\| parent.mode \| string \| no \| fast, slow/);
	assert.match(markdown, /\| parent \| object \/ object \| no/);
});
