export type FolderRole =
	| 'inbox'
	| 'sent'
	| 'drafts'
	| 'trash'
	| 'junk'
	| 'archive'
	| 'all'
	| 'flagged'
	| null;

export type Folder = {
	id: number;
	accountId: number;
	path: string;
	delimiter: string;
	role: FolderRole;
	uidValidity: number | null;
	uidNext: number | null;
	highestModSeq: number | null;
	messageCount: number | null;
	unseenCount: number | null;
	lastSyncedAt: string | null;
};

export type FolderStatus = {
	messages: number;
	unseen: number;
	uidNext: number;
	uidValidity: number;
	highestModSeq: number | null;
};
