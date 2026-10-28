import { parameterRows } from './parameter_rows.ts';
import { schemaExample } from './schema_example.ts';
import type { SurfaceTool } from './surface_types.ts';

export interface SkillMarkdownSpec<TCtx> {
	name: string;
	description: string;
	license?: string;
	compatibility?: string;
	metadata?: Record<string, string>;
	bin: string;
	packageName?: string;
	server: string;
	about: string;
	tools: readonly SurfaceTool<TCtx>[];
	workflows: readonly { name: string; description: string }[];
	principles: readonly string[];
}
export function renderSkillMarkdown<TCtx>(
	spec: SkillMarkdownSpec<TCtx>,
	{ referencesBase: _referencesBase = 'references' }: { referencesBase?: string } = {},
): string {
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(spec.name) || spec.name.length > 64)
		throw new Error('Invalid skill name');
	if (
		!spec.description.trim() ||
		spec.description.length > 1024 ||
		!spec.description.includes('Use when')
	)
		throw new Error('Invalid skill description');
	if (spec.compatibility && spec.compatibility.length > 500)
		throw new Error('Invalid compatibility');
	const lines = ['---', `name: ${spec.name}`, `description: ${JSON.stringify(spec.description)}`];
	for (const key of ['license', 'compatibility'] as const)
		if (spec[key]) lines.push(`${key}: ${JSON.stringify(spec[key])}`);
	if (spec.metadata) {
		lines.push('metadata:');
		for (const key of Object.keys(spec.metadata).sort())
			lines.push(`  ${JSON.stringify(key)}: ${JSON.stringify(spec.metadata[key])}`);
	}
	lines.push(
		'---',
		'',
		`# ${spec.name}`,
		'',
		'## Install',
		'',
		'Linux/macOS (checks SHA256SUMS and installs ~/.local/bin/ghostpaw-email):',
		'',
		'```sh',
		'curl -fsSL https://raw.githubusercontent.com/GhostPawJS/email/main/install.sh | sh',
		'```',
		'',
		'Windows x64:',
		'',
		'```powershell',
		'irm https://raw.githubusercontent.com/GhostPawJS/email/main/install.ps1 | iex',
		'```',
		'',
		`Run tools as \`${spec.bin} ...\`; use \`~/.local/bin/${spec.bin}\` if it is not on PATH.`,
		'',
		spec.about,
		'',
		'For the compact cheat sheet, run `ghostpaw-email skill --short`.',
		'',
		'## Calling tools',
		'',
		`MCP: connect to ${spec.server}, then call a tool by name with its JSON arguments.`,
		'',
		`CLI: \`${spec.bin} call <tool> '<JSON object>'\` or \`${spec.bin} <tool> --parameter value\`.`,
		'',
		`Inspect schemas with \`${spec.bin} describe <tool>\`. Use \`--db <path>\` to select a database.`,
		'',
	);
	for (const tool of spec.tools) {
		lines.push(
			`## ${tool.name}`,
			'',
			tool.description,
			'',
			`Use when: ${tool.whenToUse ?? ''}`,
			'',
			`Not for: ${tool.whenNotToUse ?? ''}`,
			'',
			tool.readOnly ? 'Read-only.' : `Writes: ${tool.sideEffects ?? 'state'}.`,
			'',
			'Nested requirements apply within the parent for the selected action.',
			'',
			'| Parameter | Type | Required | Values / description |',
			'| --- | --- | --- | --- |',
		);
		lines.push(...parameterRows(tool.inputSchema));
		lines.push('', 'Examples:', '', '```sh');
		const actions = tool.inputSchema.properties?.action?.enum?.slice(0, 3) ?? [undefined];
		for (const action of actions) {
			const input = schemaExample(tool.inputSchema, action === undefined ? {} : { action });
			lines.push(`${spec.bin} call ${tool.name} '${JSON.stringify(input)}'`);
		}
		lines.push('```');
		lines.push('');
	}
	lines.push(
		'## Workflow guides',
		'',
		...spec.workflows.map(
			(workflow) => `- \`${spec.bin} skill ${workflow.name}\`: ${workflow.description}`,
		),
		'',
		'## Principles',
		'',
		...spec.principles.map((principle) => `- ${principle}`),
		'',
	);
	if (spec.packageName)
		lines.push(
			'## Without the binary',
			'',
			`For npm-based environments (Node 24+): \`npx -y ${spec.packageName} ...\`.`,
			'',
			`Harnesses that embed it in code can import \`${spec.packageName}\` as a library.`,
			'',
		);
	return lines.join('\n');
}
