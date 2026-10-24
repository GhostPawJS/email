import type { EmailDb } from '../database.ts';
import { createMcpServer } from '../surfaces/mcp_server.ts';
import { serveMcpStdio } from '../surfaces/mcp_stdio.ts';
import { emailMcpOptions } from './email_mcp_options.ts';
import { openEmailDb } from './open_email_db.ts';
import { resolveEmailDbPath } from './resolve_email_db_path.ts';

export async function serveEmailMcp(
	options: { db?: EmailDb; dbPath?: string } = {},
): Promise<void> {
	let owned: EmailDb | undefined;
	const server = createMcpServer(
		emailMcpOptions(async () => {
			if (options.db) return options.db;
			owned = await openEmailDb(
				resolveEmailDbPath(options.dbPath === undefined ? {} : { flag: options.dbPath }),
			);
			return owned;
		}),
	);
	try {
		await serveMcpStdio(server);
	} finally {
		owned?.close();
	}
}
