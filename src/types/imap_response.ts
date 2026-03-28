import type { Address } from './address.ts';
import type { BodyPart } from './body_part.ts';

export type TokenType =
	| 'atom'
	| 'quoted'
	| 'literal'
	| 'number'
	| 'nil'
	| 'lparen'
	| 'rparen'
	| 'lbracket'
	| 'rbracket'
	| 'crlf'
	| 'plus'
	| 'star';

export type ImapToken = {
	type: TokenType;
	value: string | number | null | Buffer;
};

export type ResponseCode = {
	code: string;
	value: string | number | string[] | null;
};

export type TaggedResponse = {
	kind: 'tagged';
	tag: string;
	status: 'OK' | 'NO' | 'BAD';
	code: ResponseCode | null;
	text: string;
};

export type UntaggedResponse = {
	kind: 'untagged';
	type: string;
	number: number | null;
	data: unknown;
	code: ResponseCode | null;
};

export type ContinuationResponse = {
	kind: 'continuation';
	text: string;
};

export type ImapResponse = TaggedResponse | UntaggedResponse | ContinuationResponse;

export type ParsedEnvelope = {
	date: string | null;
	subject: string | null;
	from: Address[];
	sender: Address[];
	replyTo: Address[];
	to: Address[];
	cc: Address[];
	bcc: Address[];
	inReplyTo: string | null;
	messageId: string | null;
};

export type FetchResult = {
	uid: number;
	flags: string[];
	internalDate: string | null;
	size: number | null;
	envelope: ParsedEnvelope | null;
	bodyStructure: BodyPart | null;
	modSeq: number | null;
	bodySections: Map<string, Buffer>;
	gmailExtensions?: {
		msgId?: string;
		threadId?: string;
		labels?: string[];
	};
};
