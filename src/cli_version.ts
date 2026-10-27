import { isSea } from 'node:sea';

let npmEntry = false;

export function markNpmEntry(): void {
	npmEntry = true;
}

export function cliVersion(
	version: string,
	options: {
		isSea?: () => boolean;
		npm?: boolean;
		platform?: string;
		arch?: string;
		args?: readonly string[];
	} = {},
): string {
	let binary = false;
	try {
		binary = (options.isSea ?? isSea)();
	} catch {
		// Older runtimes may not expose SEA state.
	}
	const platform = options.platform ?? process.platform;
	const target = `${platform === 'win32' ? 'windows' : platform}-${options.arch ?? process.arch}`;
	const variant = binary ? 'binary' : (options.npm ?? npmEntry) ? 'npm' : 'library';
	if (options.args?.includes('--json'))
		return JSON.stringify({ name: 'email', version, variant, target });
	if (options.args?.includes('--short')) return version;
	return `email ${version} (${binary ? `binary, ${target}` : (options.npm ?? npmEntry) ? 'npm' : 'library'})`;
}
