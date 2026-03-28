import type {
	EmailNetworkSurface,
	EmailReadSurface,
	EmailWriteSurface,
} from '../types/surfaces.ts';
import type { EmailToolResult } from './tool_types.ts';

export type JsonSchemaType = 'array' | 'boolean' | 'integer' | 'number' | 'object' | 'string';

export interface JsonSchema {
	type?: JsonSchemaType | readonly JsonSchemaType[] | undefined;
	description?: string | undefined;
	properties?: Record<string, JsonSchema> | undefined;
	required?: readonly string[] | undefined;
	items?: JsonSchema | undefined;
	enum?: readonly unknown[] | undefined;
}

export type ToolSideEffects = 'external' | 'none' | 'read' | 'write';

/**
 * Context passed to every tool handler, containing the three live surfaces.
 * Consumers build this from a connected Mailbox instance.
 */
export interface EmailToolContext {
	read: EmailReadSurface;
	write: EmailWriteSurface;
	network: EmailNetworkSurface;
}

export interface EmailToolDefinition<TInput = unknown> {
	name: string;
	description: string;
	sideEffects: ToolSideEffects;
	inputSchema: JsonSchema;
	handler(ctx: EmailToolContext, input: TInput): Promise<EmailToolResult>;
}
