import type { EmailToolResult } from '../tools/tool_types.ts';
import { bold, dim, print, red, yellow } from './output.ts';

export type RenderOptions = {
	json: boolean;
	quiet: boolean;
};

// ─── Main render function ─────────────────────────────────────────────────────

export function renderResult(result: EmailToolResult, opts: RenderOptions): void {
	if (opts.json) {
		process.stdout.write(JSON.stringify(result, null, 2) + '\n');
		return;
	}

	if (opts.quiet) return;

	// Summary line — colored by outcome.
	const summary = formatSummary(result);
	print(summary);

	// Entities table — only if there are entities.
	if (result.entities.length > 0) {
		print('');
		const kindWidth = Math.max(...result.entities.map((e) => e.kind.length), 8);
		for (const entity of result.entities) {
			print(`  ${dim(entity.kind.padEnd(kindWidth))}  ${entity.title}`);
		}
	}

	// NextSteps hint — first entry only, dim.
	const firstHint = result.nextSteps[0];
	if (firstHint) {
		print('');
		print(dim(`  → ${firstHint}`));
	}
}

function formatSummary(result: EmailToolResult): string {
	const { outcome, summary } = result;
	if (outcome === 'error') return red(summary);
	if (outcome === 'no_op' || outcome === 'needs_clarification') return yellow(summary);
	return bold(summary);
}
