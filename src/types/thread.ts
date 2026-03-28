import type { Address } from './address.ts';
import type { Message } from './message.ts';

export type Thread = {
	threadId: string;
	subject: string | null;
	participants: Address[];
	messageCount: number;
	unreadCount: number;
	lastDate: string;
	messages: ThreadMessage[];
};

export type ThreadMessage = Message & { depth: number };
