import { emailTools } from './email_tools.ts';
import type { EmailToolDefinition } from './tool_metadata.ts';

export function getEmailToolByName(name: string): EmailToolDefinition<unknown> | undefined {
	return emailTools.find((tool) => tool.name === name) as EmailToolDefinition<unknown> | undefined;
}
