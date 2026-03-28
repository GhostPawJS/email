import type { DatabaseSync } from 'node:sqlite';
import type { Attachment, AttachmentMeta } from './attachment.ts';
import type { ComposeInput, ForwardInput, ReplyInput } from './compose.ts';
import type { EmailConfig } from './config.ts';
import type { Folder, FolderStatus } from './folder.ts';
import type { Message, MessageBody, MessageDetail } from './message.ts';
import type {
	LocalSearchOptions,
	MessageListOptions,
	SearchQuery,
	ThreadListOptions,
} from './search.ts';
import type { AccountStats } from './stats.ts';
import type { SyncOptions, SyncResult, WatchEvent, WatchOptions } from './sync.ts';
import type { Thread } from './thread.ts';

export type EmailReadSurface = {
	folders(): Folder[];
	folderStatus(path: string): FolderStatus;
	messages(folder: string, options?: MessageListOptions): Message[];
	threads(folder: string, options?: ThreadListOptions): Thread[];
	getThread(threadId: string): Thread;
	getMessage(folder: string, uid: number): Promise<MessageDetail>;
	listAttachments(folder: string, uid: number): AttachmentMeta[];
	getAttachment(folder: string, uid: number, partPath: string): Promise<Attachment>;
	search(query: string, options?: LocalSearchOptions): Message[];
	stats(): AccountStats;
	getDatabase(): DatabaseSync;
};

export type EmailWriteSurface = {
	markRead(folder: string, uids: number[]): Promise<void>;
	markUnread(folder: string, uids: number[]): Promise<void>;
	star(folder: string, uids: number[]): Promise<void>;
	unstar(folder: string, uids: number[]): Promise<void>;
	markAnswered(folder: string, uids: number[]): Promise<void>;
	copyTo(folder: string, uids: number[], destination: string): Promise<void>;
	moveTo(folder: string, uids: number[], destination: string): Promise<void>;
	archive(folder: string, uids: number[]): Promise<void>;
	trash(folder: string, uids: number[]): Promise<void>;
	moveToJunk(folder: string, uids: number[]): Promise<void>;
	markNotJunk(folder: string, uids: number[], destination?: string): Promise<void>;
	delete(folder: string, uids: number[]): Promise<void>;
	addLabels(folder: string, uids: number[], labels: string[]): Promise<void>;
	removeLabels(folder: string, uids: number[], labels: string[]): Promise<void>;
	setLabels(folder: string, uids: number[], labels: string[]): Promise<void>;
	send(input: ComposeInput): Promise<{ messageId: string }>;
	reply(folder: string, uid: number, input: ReplyInput): Promise<{ messageId: string }>;
	forward(folder: string, uid: number, input: ForwardInput): Promise<{ messageId: string }>;
	saveDraft(input: ComposeInput): Promise<{ uid: number }>;
	updateDraft(uid: number, input: ComposeInput): Promise<{ uid: number }>;
	sendDraft(uid: number): Promise<{ messageId: string }>;
	createFolder(path: string): Promise<void>;
	renameFolder(oldPath: string, newPath: string): Promise<void>;
	deleteFolder(path: string): Promise<void>;
	subscribeFolder(path: string): Promise<void>;
	unsubscribeFolder(path: string): Promise<void>;
	exportEml(folder: string, uid: number): Promise<Buffer>;
	importEml(folder: string, eml: Buffer, flags?: string[]): Promise<{ uid?: number }>;
};

export type EmailNetworkSurface = {
	connect(): Promise<void>;
	disconnect(): Promise<void>;
	reconnect(): Promise<void>;
	sync(options?: SyncOptions): Promise<SyncResult>;
	watch(options?: WatchOptions): AsyncIterable<WatchEvent>;
	refreshFolders(): Promise<Folder[]>;
	searchRemote(folder: string, query: SearchQuery): Promise<number[]>;
	fetchBody(folder: string, uid: number): Promise<MessageBody>;
	fetchAttachment(folder: string, uid: number, partPath: string): Promise<Attachment>;
};

export type EmailRuntimeSurface = {
	init(config: EmailConfig): Promise<void> | void;
};
