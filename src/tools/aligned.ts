import { emailTools as legacyTools } from './email_tools.ts';
import type { EmailToolContext, JsonSchema } from './tool_metadata.ts';
import type { EmailToolResult, ToolOutcomeKind } from './tool_types.ts';

export interface SharedEmailToolResult {
	ok: boolean;
	outcome: ToolOutcomeKind;
	summary: string;
	next: { kind: 'use_tool'; message: string }[];
	data: { entities: EmailToolResult['entities'] };
}

export interface SharedEmailToolDefinition {
	name: string;
	description: string;
	whenToUse: string;
	whenNotToUse: string;
	inputSchema: JsonSchema;
	readOnly: boolean;
	sideEffects: 'none' | 'writes_state';
	handler(ctx: EmailToolContext, input: unknown): Promise<SharedEmailToolResult>;
}

const usage: Record<string, { whenToUse: string; whenNotToUse: string }> = {
	mail_read: {
		whenToUse: 'Inspect folders, cached messages, threads, attachments or raw message content.',
		whenNotToUse: 'Use mail_search to find messages by query or mail_organize to change them.',
	},
	mail_search: {
		whenToUse: 'Find messages by a local full-text query or a remote IMAP search.',
		whenNotToUse: 'Use mail_read when the folder and message UID are already known.',
	},
	mail_compose: {
		whenToUse: 'Send, reply, forward, or save and manage a draft after its content is agreed.',
		whenNotToUse: 'Use mail_read to inspect an existing message without sending or saving content.',
	},
	mail_organize: {
		whenToUse: 'Change message flags, labels, destinations or folder organization.',
		whenNotToUse: 'Use mail_read or mail_search when only inspection is requested.',
	},
	mail_sync: {
		whenToUse: 'Connect, disconnect, reconnect, refresh folders or synchronize the cache.',
		whenNotToUse:
			'Use mail_read for cached content or the network watch stream for continuous monitoring.',
	},
};

/** Shared metadata and result adapters; legacy handlers remain available unchanged. */
export const emailTools: readonly SharedEmailToolDefinition[] = legacyTools.map((tool) => ({
	name: tool.name,
	description: tool.description,
	whenToUse: usage[tool.name]?.whenToUse ?? tool.description,
	whenNotToUse: usage[tool.name]?.whenNotToUse ?? 'Use a tool matching the requested operation.',
	inputSchema: tool.inputSchema,
	// Read tools can fetch remote data and update the local cache.
	readOnly: false,
	sideEffects: 'writes_state',
	async handler(ctx, input) {
		const result: EmailToolResult = await tool.handler(ctx, input as never);
		return {
			ok: result.outcome === 'success' || result.outcome === 'no_op',
			outcome: result.outcome,
			summary: result.summary,
			next: result.nextSteps.map((message) => ({ kind: 'use_tool' as const, message })),
			data: { entities: result.entities },
		};
	},
}));

export function listEmailToolDefinitions(): SharedEmailToolDefinition[] {
	return [...emailTools];
}

export function getEmailToolByName(name: string): SharedEmailToolDefinition | null {
	return emailTools.find((tool) => tool.name === name) ?? null;
}
