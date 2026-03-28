export type SelectedFolder = {
	exists: number;
	recent: number;
	flags: string[];
	permanentFlags: string[];
	uidValidity: number;
	uidNext: number;
	highestModSeq: number | null;
};

export type NegotiatedExtensions = {
	condstore: boolean;
	qresync: boolean;
	move: boolean;
	uidplus: boolean;
	compress: boolean;
	idle: boolean;
	sort: boolean;
	thread: boolean;
	specialUse: boolean;
	namespace: boolean;
	id: boolean;
	quota: boolean;
	literalPlus: boolean;
	esearch: boolean;
	listStatus: boolean;
	binary: boolean;
	unselect: boolean;
	appendLimit: number | null;
};
