import { EmailAuthError, EmailConnectionError, EmailTimeoutError } from '../errors.ts';
import { ConfigError } from './config.ts';
import { printError } from './output.ts';

// ─── Error codes and exit codes ───────────────────────────────────────────────

export type CliErrorCode =
	| 'no_config'
	| 'config_malformed'
	| 'config_version_unknown'
	| 'account_invalid'
	| 'account_not_found'
	| 'no_default_account'
	| 'auth_failed'
	| 'network_error'
	| 'tool_error'
	| 'needs_clarification'
	| 'missing_required_flag'
	| 'invalid_flag_value'
	| 'body_required'
	| 'unknown_subaction';

const EXIT_CODES: Record<CliErrorCode, number> = {
	no_config: 2,
	config_malformed: 2,
	config_version_unknown: 2,
	account_invalid: 2,
	account_not_found: 2,
	no_default_account: 2,
	auth_failed: 3,
	network_error: 4,
	tool_error: 5,
	needs_clarification: 6,
	missing_required_flag: 1,
	invalid_flag_value: 1,
	body_required: 1,
	unknown_subaction: 1,
};

export class CliError extends Error {
	readonly code: CliErrorCode;
	readonly exitCode: number;

	constructor(code: CliErrorCode, message: string) {
		super(message);
		this.name = 'CliError';
		this.code = code;
		this.exitCode = EXIT_CODES[code] ?? 127;
	}
}

// ─── Centralized error handler ────────────────────────────────────────────────

export type ErrorResult = { exitCode: number; message: string; hint?: string };

export function handleCliError(err: unknown): ErrorResult {
	if (err instanceof CliError) {
		return { exitCode: err.exitCode, message: err.message };
	}

	if (err instanceof ConfigError) {
		return {
			exitCode: EXIT_CODES[err.code] ?? 2,
			message: err.message,
		};
	}

	if (err instanceof EmailAuthError) {
		return {
			exitCode: 3,
			message: `Authentication failed: ${err.message}`,
			hint: 'Check your credentials with `email account show`.',
		};
	}

	if (err instanceof EmailConnectionError || err instanceof EmailTimeoutError) {
		return {
			exitCode: 4,
			message: `Connection failed: ${err.message}`,
			hint: 'Check your network and IMAP host/port settings.',
		};
	}

	if (err instanceof Error) {
		return { exitCode: 127, message: `Unexpected error: ${err.message}` };
	}

	return { exitCode: 127, message: `Unexpected error: ${String(err)}` };
}

/**
 * Wraps a command's run body so errors never bubble up to citty's own handler.
 * Call as: `await safeRun(args, async () => { ... })`
 */
export async function safeRun(
	args: Record<string, unknown>,
	fn: () => Promise<void>,
): Promise<void> {
	try {
		await fn();
	} catch (err) {
		const useJson = Boolean(args['json']);
		const exitCode = reportError(err, useJson);
		process.exit(exitCode);
	}
}

/** Print an error result to stderr (or stdout as JSON) and return the exit code. */
export function reportError(err: unknown, useJson: boolean): number {
	const result = handleCliError(err);

	if (useJson) {
		// Always print JSON to stdout so consumers can parse stdout unconditionally.
		process.stdout.write(
			JSON.stringify(
				{
					outcome: 'error',
					summary: result.message,
					entities: [],
					nextSteps: result.hint ? [result.hint] : [],
				},
				null,
				2,
			) + '\n',
		);
	} else {
		printError(result.message);
		if (result.hint) printError(result.hint);
	}

	return result.exitCode;
}
