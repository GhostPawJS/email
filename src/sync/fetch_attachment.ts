import type { EmailDb } from '../database.ts';
import type { ImapSession } from '../imap/session.ts';
import { decodeTransferEncoding } from '../mime/decode_transfer_encoding.ts';
import { getFolder } from '../store/get_folder.ts';
import { getMessage } from '../store/get_message.ts';
import { listAttachments } from '../store/list_attachments.ts';
import { updateAttachmentData } from '../store/update_attachment_data.ts';

export async function fetchAttachment(
	session: ImapSession,
	db: EmailDb,
	accountId: number,
	folderPath: string,
	uid: number,
	partPath: string,
): Promise<Buffer> {
	const folder = getFolder(db, accountId, folderPath);
	if (!folder) throw new Error(`Folder not found: ${folderPath}`);

	const message = getMessage(db, folder.id, uid);
	if (!message) throw new Error(`Message not found: uid ${uid}`);

	const attachments = listAttachments(db, message.id);
	const att = attachments.find((a) => a.partPath === partPath);
	if (!att) throw new Error(`Attachment part ${partPath} not found`);

	const results = await session.fetchMessages(String(uid), [`BODY.PEEK[${partPath}]`]);
	const result = results[0];
	if (!result) throw new Error('No FETCH response');

	const raw = result.bodySections.get(partPath);
	if (!raw) throw new Error(`Part ${partPath} not in FETCH response`);

	const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as string);
	// Detect and strip transfer encoding from body structure
	let encoding: 'base64' | 'quoted-printable' | '7bit' | '8bit' | 'binary' = 'binary';
	if (message.bodyStructure) {
		const findPart = (
			node: typeof message.bodyStructure,
			path: string,
		): typeof message.bodyStructure | null => {
			if (!node) return null;
			if (path === '') return node;
			const parts = path.split('.');
			let cur = node;
			for (const p of parts) {
				const idx = Number.parseInt(p, 10) - 1;
				if (!cur?.children?.[idx]) return null;
				cur = cur.children[idx] ?? null;
			}
			return cur;
		};
		const partNode = findPart(message.bodyStructure, partPath);
		if (partNode?.encoding) {
			const enc = partNode.encoding.toLowerCase();
			if (enc === 'base64') encoding = 'base64';
			else if (enc === 'quoted-printable') encoding = 'quoted-printable';
			else if (enc === '7bit') encoding = '7bit';
			else if (enc === '8bit') encoding = '8bit';
		}
	}

	const decoded = decodeTransferEncoding(buf, encoding);
	updateAttachmentData(db, att.id, decoded);
	return decoded;
}
