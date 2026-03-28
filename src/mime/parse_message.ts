import type { AttachmentMeta } from '../types/attachment.ts';
import type { BodyPart } from '../types/body_part.ts';
import { decodeContentType } from './decode_content_type.ts';
import { decodeTransferEncoding } from './decode_transfer_encoding.ts';
import { extractAttachments } from './extract_attachments.ts';
import { extractTextParts } from './extract_text_parts.ts';
import { parseHeaders } from './parse_headers.ts';
import { type MimePart, parseMultipart } from './parse_multipart.ts';
import type { StructuredHeaders } from './parse_structured_headers.ts';
import { parseStructuredHeaders } from './parse_structured_headers.ts';

export type ParsedMessage = {
	headers: StructuredHeaders;
	rawHeaders: Map<string, string[]>;
	textPlain: string | null;
	textHtml: string | null;
	attachments: AttachmentMeta[];
	bodyStructure: BodyPart;
};

function simpleBodyPart(ct: string): BodyPart {
	const d = decodeContentType(ct);
	return {
		type: d.type,
		subtype: d.subtype,
		params: d.params,
		id: null,
		description: null,
		encoding: '7bit',
		size: 0,
		partPath: '1',
	};
}

export function parseMessage(raw: Buffer): ParsedMessage {
	const str = raw.toString('binary');
	const split = str.indexOf('\r\n\r\n');
	const headerBlock = split >= 0 ? str.slice(0, split) : str;
	const body = split >= 0 ? Buffer.from(str.slice(split + 4), 'binary') : Buffer.alloc(0);
	const rawHeaders = parseHeaders(headerBlock);
	const headers = parseStructuredHeaders(rawHeaders);
	const ct = headers.contentType;
	let textPlain: string | null = null;
	let textHtml: string | null = null;
	let attachments: AttachmentMeta[] = [];
	let parts: MimePart[] = [];
	let bodyStructure: BodyPart;

	if (ct && ct.type === 'multipart' && ct.params.boundary) {
		parts = parseMultipart(body, ct.params.boundary);
		const ex = extractTextParts(parts);
		textPlain = ex.textPlain;
		textHtml = ex.textHtml;
		attachments = extractAttachments(parts);
		bodyStructure = {
			type: 'multipart',
			subtype: ct.subtype,
			params: ct.params,
			id: null,
			description: null,
			encoding: '7bit',
			size: body.length,
			children: [],
			partPath: '',
		};
	} else if (ct?.type === 'message' && ct.subtype === 'rfc822') {
		const inner = parseMessage(body);
		textPlain = inner.textPlain;
		textHtml = inner.textHtml;
		attachments = inner.attachments;
		bodyStructure = inner.bodyStructure;
	} else {
		const enc = headers.contentTransferEncoding ?? '7bit';
		const dec = decodeTransferEncoding(body, enc);
		const cs = ct?.params.charset?.replace(/^"|"$/g, '') ?? 'utf-8';
		let text: string;
		try {
			text = new TextDecoder(cs).decode(dec);
		} catch {
			text = dec.toString('utf8');
		}
		if (ct?.type === 'text' && ct.subtype === 'html') {
			textHtml = text;
		} else {
			textPlain = text;
		}
		bodyStructure = ct
			? simpleBodyPart(rawHeaders.get('content-type')?.[0] ?? 'text/plain')
			: simpleBodyPart('text/plain');
		bodyStructure.size = body.length;
	}
	return {
		headers,
		rawHeaders,
		textPlain,
		textHtml,
		attachments,
		bodyStructure,
	};
}
