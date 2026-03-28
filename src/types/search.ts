export type SearchQuery = {
	all?: boolean;
	unseen?: boolean;
	seen?: boolean;
	flagged?: boolean;
	answered?: boolean;
	deleted?: boolean;
	draft?: boolean;
	since?: Date;
	before?: Date;
	on?: Date;
	from?: string;
	to?: string;
	cc?: string;
	subject?: string;
	body?: string;
	text?: string;
	header?: { name: string; value: string };
	larger?: number;
	smaller?: number;
	uid?: string;
	modseq?: number;
	gmailRaw?: string;
	or?: [SearchQuery, SearchQuery];
	not?: SearchQuery;
};

export type LocalSearchOptions = {
	folder?: string;
	since?: Date;
	before?: Date;
	hasAttachments?: boolean;
	unreadOnly?: boolean;
	limit?: number;
};

export type MessageListOptions = {
	limit?: number;
	offset?: number;
	sort?: 'date' | 'from' | 'subject' | 'size';
	order?: 'asc' | 'desc';
};

export type ThreadListOptions = {
	limit?: number;
	offset?: number;
};
