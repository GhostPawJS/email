import { Mailbox } from '../mailbox.ts';
import type { EmailToolContext } from '../tools/tool_metadata.ts';
import { buildEmailConfig } from './account.ts';
import type { AccountEntry } from './config.ts';
import { ensureDataDir } from './config.ts';

// ─── Core lifecycle wrapper ───────────────────────────────────────────────────

/**
 * Constructs a Mailbox from the account config, connects it, runs fn with the
 * tool context, then disconnects in a finally block.
 *
 * Also registers SIGINT/SIGTERM handlers so an interrupted command still closes
 * the SQLite WAL cleanly.
 */
export async function withMailbox<T>(
	account: AccountEntry,
	fn: (ctx: EmailToolContext) => Promise<T>,
): Promise<T> {
	const config = buildEmailConfig(account);
	ensureDataDir();

	const mailbox = new Mailbox(config);
	let disconnected = false;

	const cleanup = async (): Promise<void> => {
		if (disconnected) return;
		disconnected = true;
		try {
			await mailbox.disconnect();
		} catch {
			// Swallow disconnect errors so they don't shadow the original error.
		}
	};

	const onSignal = (): void => {
		cleanup().finally(() => process.exit(1));
	};

	process.once('SIGINT', onSignal);
	process.once('SIGTERM', onSignal);

	await mailbox.connect();

	try {
		const ctx: EmailToolContext = {
			read: mailbox.read,
			write: mailbox.write,
			network: mailbox.network,
		};
		return await fn(ctx);
	} finally {
		process.off('SIGINT', onSignal);
		process.off('SIGTERM', onSignal);
		await cleanup();
	}
}
