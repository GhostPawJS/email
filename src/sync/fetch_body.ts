import type { EmailDb } from '../database.ts';
import type { ImapSession } from '../imap/session.ts';
import { parseMessage } from '../mime/parse_message.ts';
import { getFolder } from '../store/get_folder.ts';
import { getMessage } from '../store/get_message.ts';
import { upsertBody } from '../store/upsert_body.ts';
import { populateFts } from './fts_populate.ts';

export async function fetchBody(
	session: ImapSession,
	db: EmailDb,
	accountId: number,
	folderPath: string,
	uid: number,
): Promise<void> {
	const folder = getFolder(db, accountId, folderPath);
	if (!folder) throw new Error(`Folder not found: ${folderPath}`);

	const message = getMessage(db, folder.id, uid);
	if (!message) throw new Error(`Message not found: ${folderPath} uid ${uid}`);

	const results = await session.fetchMessages(String(uid), ['BODY.PEEK[]']);
	const result = results[0];
	if (!result) return;

	const rawSection = result.bodySections.get('') ?? result.bodySections.get('BODY[]');
	if (!rawSection) return;

	const raw = Buffer.isBuffer(rawSection) ? rawSection : Buffer.from(rawSection as string);
	const parsed = parseMessage(raw);

	upsertBody(db, message.id, parsed.textPlain, parsed.textHtml, raw);
	populateFts(db, message.id, parsed.textPlain, parsed.textHtml);
}
