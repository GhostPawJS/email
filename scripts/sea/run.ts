import { runEmailCli } from '../../src/cli/index.ts';
export const run = (): Promise<void> =>
	runEmailCli().then(
		() => {},
		(error: unknown) => {
			process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
			process.exitCode = 1;
		},
	);
