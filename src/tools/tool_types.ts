export type ToolEntityKind =
	| 'account'
	| 'attachment'
	| 'mailbox'
	| 'message'
	| 'sync_job'
	| 'thread'
	| 'transport';

export type ToolOutcomeKind = 'error' | 'needs_clarification' | 'no_op' | 'success';

export interface ToolEntityRef {
	kind: ToolEntityKind;
	id: string;
	title: string;
}

export interface EmailToolResult {
	outcome: ToolOutcomeKind;
	summary: string;
	entities: readonly ToolEntityRef[];
	nextSteps: readonly string[];
}
