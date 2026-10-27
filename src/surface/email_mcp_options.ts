import type { EmailDb } from '../database.ts';
import type { McpServerOptions } from '../surfaces/mcp_server.ts';
import { emailVersion } from '../version.ts';
import { emailMcpInstructions } from './email_mcp_instructions.ts';
import { emailMcpTools } from './email_surface_tools.ts';

export function emailMcpOptions(
	context: () => EmailDb | Promise<EmailDb>,
): McpServerOptions<EmailDb> {
	return {
		name: 'ghostpaw-email',
		version: emailVersion,
		title: 'Email',
		instructions: emailMcpInstructions,
		tools: emailMcpTools,
		context,
		annotations: (tool) => ({
			readOnlyHint: tool.readOnly ?? false,
			destructiveHint: ['mail_organize', 'mail_compose'].includes(tool.name),
			idempotentHint: tool.readOnly ?? false,
			openWorldHint: true,
		}),
	};
}
