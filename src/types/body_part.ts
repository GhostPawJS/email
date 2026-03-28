export type BodyPart = {
	type: string;
	subtype: string;
	params: Record<string, string>;
	id: string | null;
	description: string | null;
	encoding: string;
	size: number;
	lines?: number;
	disposition?: { type: string; params: Record<string, string> } | null;
	children?: BodyPart[];
	partPath: string;
};
