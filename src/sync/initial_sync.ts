import type { EmailDb } from '../database.ts';
import type { ImapSession } from '../imap/session.ts';
import { computeThreads } from '../store/compute_threads.ts';
import { insertMessagesBatch } from '../store/insert_messages_batch.ts';
import { listMessages } from '../store/list_messages.ts';
import { updateFolderSync } from '../store/update_folder_sync.ts';
import type { Address } from '../types/address.ts';
import type { BodyPart } from '../types/body_part.ts';
import { DEFAULT_BATCH_SIZE } from '../types/defaults.ts';
import type { FetchResult } from '../types/imap_response.ts';
import type { InsertMessageInput } from '../types/message.ts';
import type { SyncFolderResult } from '../types/sync.ts';

function hasAttachments(bs: BodyPart | null): boolean {
	if (!bs) return false;
	if (bs.disposition?.type === 'attachment') return true;
	if (bs.children) return bs.children.some(hasAttachments);
	return false;
}

function fetchToInsert(r: FetchResult, folderId: number): InsertMessageInput {
	const env = r.envelope;
	const threadRef = env?.inReplyTo ?? r.envelope?.messageId ?? null;
	return {
		folderId,
		uid: r.uid,
		messageId: env?.messageId ?? null,
		inReplyTo: env?.inReplyTo ?? null,
		references: [],
		threadId: threadRef,
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
		hasAttachments: hasAttachments(r.bodyStructure),
		modSeq: r.modSeq,
	};
}

export async function initialSync(
	session: ImapSession,
	db: EmailDb,
	folderId: number,
	folderPath: string,
): Promise<SyncFolderResult> {
	const start = Date.now();
	const sel = await session.selectFolder(folderPath);
	updateFolderSync(db, folderId, {
		uidValidity: sel.uidValidity,
		uidNext: sel.uidNext,
		highestModSeq: sel.highestModSeq,
		messageCount: sel.exists,
	});

	if (sel.exists > 0) {
		const results = await session.fetchMessages('1:*', [
			'UID',
			'FLAGS',
			'ENVELOPE',
			'BODYSTRUCTURE',
			'RFC822.SIZE',
			'INTERNALDATE',
		]);
		// batch inserts
		for (let i = 0; i < results.length; i += DEFAULT_BATCH_SIZE) {
			const batch = results.slice(i, i + DEFAULT_BATCH_SIZE);
			const inputs = batch.map((r) => fetchToInsert(r, folderId));
			insertMessagesBatch(db, inputs);
		}
		computeThreads(db, folderId);
	}

	const unseenCount = listMessages(db, folderId).filter((m) => !m.flags.includes('\\Seen')).length;
	updateFolderSync(db, folderId, {
		messageCount: sel.exists,
		unseenCount,
		lastSyncedAt: new Date().toISOString(),
	});

	return {
		path: folderPath,
		newMessages: sel.exists,
		updatedFlags: 0,
		expunged: 0,
		duration: Date.now() - start,
	};
}
