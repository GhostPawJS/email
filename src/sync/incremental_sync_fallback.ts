import type { EmailDb } from '../database.ts';
import type { ImapSession } from '../imap/session.ts';
import { deleteMessages } from '../store/delete_messages.ts';
import { getMessage } from '../store/get_message.ts';
import { insertMessagesBatch } from '../store/insert_messages_batch.ts';
import { listMessages } from '../store/list_messages.ts';
import { updateFolderSync } from '../store/update_folder_sync.ts';
import { updateMessageFlags } from '../store/update_message_flags.ts';
import type { Address } from '../types/address.ts';
import type { Folder } from '../types/folder.ts';
import type { InsertMessageInput } from '../types/message.ts';
import type { SyncFolderResult } from '../types/sync.ts';

export const UIDVALIDITY_CHANGED = 'uidvalidity_changed' as const;

export async function incrementalSyncFallback(
	session: ImapSession,
	db: EmailDb,
	folder: Folder,
): Promise<SyncFolderResult | typeof UIDVALIDITY_CHANGED> {
	const start = Date.now();
	const sel = await session.selectFolder(folder.path);

	if (folder.uidValidity !== null && sel.uidValidity !== folder.uidValidity) {
		return UIDVALIDITY_CHANGED;
	}

	// Get remote UIDs
	const remoteUids = await session.searchMessages('ALL');
	const remoteSet = new Set(remoteUids);

	// Get local UIDs
	const localMessages = listMessages(db, folder.id, { limit: 100_000 });
	const localUids = localMessages.map((m) => m.uid);
	const localSet = new Set(localUids);

	// Expunge missing
	const expungedUids = localUids.filter((uid) => !remoteSet.has(uid));
	if (expungedUids.length) deleteMessages(db, folder.id, expungedUids);

	// Fetch new
	const newUids = remoteUids.filter((uid) => !localSet.has(uid));
	let newMessages = 0;
	if (newUids.length) {
		const newResults = await session.fetchMessages(newUids.join(','), [
			'UID',
			'FLAGS',
			'ENVELOPE',
			'BODYSTRUCTURE',
			'RFC822.SIZE',
			'INTERNALDATE',
		]);
		const toInsert: InsertMessageInput[] = newResults.map((r) => {
			const env = r.envelope;
			return {
				folderId: folder.id,
				uid: r.uid,
				messageId: env?.messageId ?? null,
				inReplyTo: env?.inReplyTo ?? null,
				references: [],
				threadId: env?.inReplyTo ?? env?.messageId ?? null,
				from: (env?.from[0] ?? null) as Address | null,
				to: (env?.to ?? []) as Address[],
				cc: (env?.cc ?? []) as Address[],
				bcc: (env?.bcc ?? []) as Address[],
				replyTo: (env?.replyTo[0] ?? null) as Address | null,
				subject: env?.subject ?? null,
				date: env?.date ?? null,
				receivedAt: r.internalDate ?? new Date().toISOString(),
				envelopeFrom: (env?.sender[0] ?? null) as Address | null,
				envelopeTo: (env?.to ?? []) as Address[],
				flags: r.flags,
				labels: [],
				size: r.size,
				bodyStructure: r.bodyStructure,
				hasAttachments: false,
				modSeq: r.modSeq,
			};
		});
		insertMessagesBatch(db, toInsert);
		newMessages = toInsert.length;
	}

	// Update flags
	let updatedFlags = 0;
	const flagResults = await session.fetchMessages('1:*', ['UID', 'FLAGS']);
	for (const r of flagResults) {
		const m = getMessage(db, folder.id, r.uid);
		if (m && JSON.stringify(m.flags) !== JSON.stringify(r.flags)) {
			updateMessageFlags(db, folder.id, r.uid, r.flags);
			updatedFlags++;
		}
	}

	updateFolderSync(db, folder.id, {
		uidValidity: sel.uidValidity,
		uidNext: sel.uidNext,
		messageCount: sel.exists,
		lastSyncedAt: new Date().toISOString(),
	});

	return {
		path: folder.path,
		newMessages,
		updatedFlags,
		expunged: expungedUids.length,
		duration: Date.now() - start,
	};
}
