import { emailTools } from './email_tools.ts';
import type { EmailToolDefinition } from './tool_metadata.ts';

/** @deprecated Use tools.aligned.getEmailToolByName for the shared result shape. */
export function getEmailToolByName(name: string): EmailToolDefinition<unknown> | undefined {
	return emailTools.find((tool) => tool.name === name) as EmailToolDefinition<unknown> | undefined;
}
