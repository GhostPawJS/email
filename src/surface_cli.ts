import { emailCliOptions } from './surface/email_cli_options.ts';
import { runToolCli } from './surfaces/cli.ts';

process.exitCode = await runToolCli(process.argv.slice(2), emailCliOptions);
