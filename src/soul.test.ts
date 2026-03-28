import assert from 'node:assert/strict';
import test from 'node:test';

import {
	emailSoul,
	emailSoulEssence,
	emailSoulTraits,
	renderEmailSoulPromptFoundation,
} from './soul.ts';

test('emailSoul exports the canonical soul shape', () => {
	assert.equal(emailSoul.slug, 'postmaster');
	assert.equal(emailSoul.name, 'Postmaster');
	assert.ok(emailSoul.description.length > 0);
	assert.equal(emailSoul.essence, emailSoulEssence);
	assert.equal(emailSoul.traits, emailSoulTraits);
	assert.equal(emailSoul.traits.length, 5);
});

test('every trait has a non-empty principle and provenance', () => {
	for (const trait of emailSoulTraits) {
		assert.ok(trait.principle.length > 0, 'trait.principle must be non-empty');
		assert.ok(trait.provenance.length > 0, 'trait.provenance must be non-empty');
	}
});

test('renderEmailSoulPromptFoundation includes name, slug, essence, and all traits', () => {
	const rendered = renderEmailSoulPromptFoundation();

	assert.match(rendered, /Postmaster \(postmaster\)/);
	assert.ok(
		rendered.includes(emailSoulEssence.slice(0, 80)),
		'should include beginning of essence',
	);
	assert.ok(rendered.includes('Traits:'), 'should include Traits: heading');

	for (const trait of emailSoulTraits) {
		assert.ok(rendered.includes(trait.principle), `should include principle: "${trait.principle}"`);
		assert.ok(
			rendered.includes(trait.provenance.slice(0, 60)),
			`should include provenance for: "${trait.principle}"`,
		);
	}
});

test('renderEmailSoulPromptFoundation accepts a custom soul override', () => {
	const custom: typeof emailSoul = {
		slug: 'test-soul',
		name: 'Test Soul',
		description: 'A test soul.',
		essence: 'Custom essence.',
		traits: [{ principle: 'Test principle.', provenance: 'Test provenance.' }],
	};
	const rendered = renderEmailSoulPromptFoundation(custom);
	assert.match(rendered, /Test Soul \(test-soul\)/);
	assert.ok(rendered.includes('Custom essence.'));
	assert.ok(rendered.includes('Test principle.'));
});
