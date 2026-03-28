import type { Message } from './message.ts';

export type SyncOptions = {
	folders?: string[];
	fullSync?: boolean;
	bodies?: 'none' | 'missing' | 'all';
};

export type SyncFolderResult = {
	path: string;
	newMessages: number;
	updatedFlags: number;
	expunged: number;
	duration: number;
};

export type SyncResult = {
	folders: SyncFolderResult[];
	totalNew: number;
	totalExpunged: number;
};

export type WatchOptions = {
	folders?: string[];
	signal?: AbortSignal;
};

export type WatchEvent =
	| { type: 'new'; folder: string; messages: Message[] }
	| { type: 'flags'; folder: string; uid: number; flags: string[] }
	| { type: 'expunge'; folder: string; uid: number };
