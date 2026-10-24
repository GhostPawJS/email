import { homedir } from 'node:os';
import { join } from 'node:path';

export function resolveEmailDbPath(
	options: { flag?: string; env?: Record<string, string | undefined> } = {},
): string {
	return (
		options.flag ??
		((options.env ?? process.env).GHOSTPAW_EMAIL_DB || join(homedir(), '.ghostpaw', 'email.db'))
	);
}
