import type { EmailDb } from './database.ts';
import { emailMcpOptions } from './surface/email_mcp_options.ts';
import { openEmailDb } from './surface/open_email_db.ts';
import { resolveEmailDbPath } from './surface/resolve_email_db_path.ts';
import { createMcpServer } from './surfaces/mcp_server.ts';

export { emailMcpInstructions } from './surface/email_mcp_instructions.ts';
export { serveEmailMcp } from './surface/serve_email_mcp.ts';
export type { McpServerOptions } from './surfaces/mcp_server.ts';
export {
	createMcpServer,
	MCP_LATEST_PROTOCOL_VERSION,
	MCP_SUPPORTED_PROTOCOL_VERSIONS,
} from './surfaces/mcp_server.ts';
export { serveMcpStdio } from './surfaces/mcp_stdio.ts';
export type * from './surfaces/surface_types.ts';

export function createEmailMcpServer(options: { db?: EmailDb; dbPath?: string } = {}) {
	return createMcpServer(
		emailMcpOptions(
			() =>
				options.db ??
				openEmailDb(
					resolveEmailDbPath(options.dbPath === undefined ? {} : { flag: options.dbPath }),
				),
		),
	);
}
