import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { cliGuide } from '../skills/cli-guide.ts';
import { emailSkills } from '../skills/email_skills.ts';
import { renderSkillMarkdown } from '../surfaces/skill_markdown.ts';
import { validateInput } from '../surfaces/validate_input.ts';
import { emailCliOptions } from './email_cli_options.ts';
import { emailSkillSpec } from './email_skill_spec.ts';
import { emailSurfaceTools } from './email_surface_tools.ts';

test('embedded guides equal committed references byte for byte', async () => {
	const skill = emailCliOptions.commands?.skill;
	assert.ok(skill);
	for (const guide of [...emailSkills, cliGuide]) {
		assert.equal(
			await skill([guide.name]),
			readFileSync(
				new URL(`../../skills/email/references/${guide.name}.md`, import.meta.url),
				'utf8',
			),
		);
		assert.ok((await skill(['--list'])).includes(`${guide.name}  `));
	}
	assert.match(await skill(['--help']), /skill <guide>/);
	await assert.rejects(
		async () => skill(['missing']),
		/unknown guide missing; run ghostpaw-email skill --list/,
	);
});

test('every generated call example validates against its tool input schema', () => {
	const markdown = renderSkillMarkdown(emailSkillSpec);
	const examples = [...markdown.matchAll(/^ghostpaw-email call (\w+) '(.*)'$/gm)];
	for (const tool of emailSurfaceTools) assert.ok(examples.some((match) => match[1] === tool.name));
	for (const [, name, json] of examples) {
		const tool = emailSurfaceTools.find((tool) => tool.name === name);
		assert.ok(tool);
		assert.deepEqual(validateInput(tool.inputSchema, JSON.parse(json ?? '')), [], name);
	}
	assert.match(markdown, /\| input.to \| array \| yes/);
	assert.match(markdown, /\| input.subject \| string \| yes/);
	const body = markdown.split('## Without the binary')[0] ?? '';
	assert.doesNotMatch(body, /npx|npm|Node\.js 24/);
});

test('skill output uses runnable guides, complete descriptions and a compact cheat sheet', async () => {
	const skill = emailCliOptions.commands?.skill;
	assert.ok(skill);
	const full = await skill([]);
	assert.doesNotMatch(full, /references\//);
	for (const guide of [...emailSkills, cliGuide])
		assert.ok(full.includes(`ghostpaw-email skill ${guide.name}`));
	for (const line of full
		.split('\n')
		.filter((line) => line.startsWith('| ') && !line.startsWith('| ---')))
		assert.ok(line.split('|').at(-2)?.trim(), line);
	const short = await skill(['--short']);
	assert.ok(short.trim().split('\n').length >= 30);
	assert.ok(short.trim().split('\n').length < 45);
	for (const expected of [
		'--version',
		'skill --short',
		'skill --list',
		'npm install',
		'describe',
		'call',
	])
		assert.ok(short.includes(expected), expected);
	assert.match(await skill(['--help']), /--short/);
});
