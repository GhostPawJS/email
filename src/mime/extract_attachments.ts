import type { AttachmentMeta } from '../types/attachment.ts';
import { decodeContentDisposition } from './decode_content_disposition.ts';
import { decodeContentType } from './decode_content_type.ts';
import type { MimePart } from './parse_multipart.ts';

function isAttachmentDisposition(h: Map<string, string[]>): boolean {
	const cd = h.get('content-disposition')?.[0];
	if (!cd) return false;
	return decodeContentDisposition(cd).type === 'attachment';
}

export function extractAttachments(parts: MimePart[], basePath = ''): AttachmentMeta[] {
	const out: AttachmentMeta[] = [];

	const walk = (list: MimePart[], prefix: string) => {
		let i = 0;
		for (const p of list) {
			i += 1;
			const path = prefix ? `${prefix}.${i}` : String(i);
			if (p.children?.length) {
				walk(p.children, path);
				continue;
			}
			const ctRaw = p.headers.get('content-type')?.[0] ?? '';
			const d = decodeContentType(ctRaw);
			const cdRaw = p.headers.get('content-disposition')?.[0];
			const cdd = cdRaw ? decodeContentDisposition(cdRaw) : null;
			const fn = cdd?.params.filename ?? d.params.filename ?? d.params.name ?? null;
			const inlineDisp = cdd?.type === 'inline';
			const cid = p.headers.get('content-id')?.[0]?.replace(/^<|>$/g, '') ?? null;
			const isMultipart = d.type === 'multipart' || d.type === 'message';
			const isText = d.type === 'text';
			const attach =
				isAttachmentDisposition(p.headers) ||
				(!!fn && !inlineDisp) ||
				(!isText && !isMultipart && !inlineDisp && d.type !== 'text');
			if (attach || inlineDisp) {
				out.push({
					id: 0,
					messageId: 0,
					filename: fn,
					mimeType: ctRaw ? `${d.type}/${d.subtype}` : null,
					size: p.body.length,
					contentId: cid,
					partPath: path,
					inline: inlineDisp,
				});
			}
		}
	};

	walk(parts, basePath);
	return out;
}
