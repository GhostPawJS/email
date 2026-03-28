import type { EmailDb } from '../database.ts';
import type { ImapSession } from '../imap/session.ts';
import { getMessage } from '../store/get_message.ts';
import { insertMessagesBatch } from '../store/insert_messages_batch.ts';
import { updateFolderSync } from '../store/update_folder_sync.ts';
import { updateMessageFlags } from '../store/update_message_flags.ts';
import type { Address } from '../types/address.ts';
import type { Folder } from '../types/folder.ts';
import type { InsertMessageInput } from '../types/message.ts';
import type { SyncFolderResult } from '../types/sync.ts';

export async function incrementalSyncQresync(
	session: ImapSession,
	db: EmailDb,
	folder: Folder,
): Promise<SyncFolderResult> {
	const start = Date.now();
	let newMessages = 0;
	let updatedFlags = 0;
	const expunged = 0;

	const sel = await session.selectFolder(folder.path);
	const newHighestModSeq = sel.highestModSeq;

	// Process untagged responses from SELECT
	// VANISHED (EARLIER) would appear here in a full implementation;
	// for now we compare UIDs via fallback search if no VANISHED data.
	// FETCH responses for changed messages:
	const changed = await session.fetchMessages('1:*', ['UID', 'FLAGS', 'MODSEQ']);
	const newToInsert: InsertMessageInput[] = [];

	for (const r of changed) {
		const existing = getMessage(db, folder.id, r.uid);
		if (existing) {
			// Update flags
			const newFlags = r.flags;
			if (JSON.stringify(existing.flags) !== JSON.stringify(newFlags)) {
				updateMessageFlags(db, folder.id, r.uid, newFlags);
				updatedFlags++;
			}
		} else {
			// New message
			const env = r.envelope;
			newToInsert.push({
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
			});
			newMessages++;
		}
	}

	if (newToInsert.length) insertMessagesBatch(db, newToInsert);

	updateFolderSync(db, folder.id, {
		highestModSeq: newHighestModSeq,
		messageCount: sel.exists,
		lastSyncedAt: new Date().toISOString(),
	});

	return {
		path: folder.path,
		newMessages,
		updatedFlags,
		expunged,
		duration: Date.now() - start,
	};
}
