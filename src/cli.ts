import { runEmailCli } from './cli/index.ts';
import { markNpmEntry } from './cli_version.ts';

markNpmEntry();
await runEmailCli();
