export type AccountStats = {
	folders: {
		path: string;
		role: string | null;
		total: number;
		unread: number;
	}[];
	totalMessages: number;
	totalUnread: number;
	lastSyncedAt: string | null;
	storageUsed: number;
};
