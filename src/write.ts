import type { EmailDb } from './database.ts';
import { EmailNotFoundError, EmailUnsupportedError } from './errors.ts';
import type { ImapSession } from './imap/session.ts';
import { generateMessageId } from './lib/generate_id.ts';
import { composeForward } from './mime/compose_forward.ts';
import { composeMessage } from './mime/compose_message.ts';
import { composeReply } from './mime/compose_reply.ts';
import { smtpSend } from './smtp/send_flow.ts';
import * as store from './store/index.ts';
import type { Address } from './types/address.ts';
import type { ComposeInput, ForwardInput, ReplyInput } from './types/compose.ts';
import type { EmailConfig } from './types/config.ts';
import type { EmailWriteSurface } from './types/surfaces.ts';

export type CreateWriteSurfaceOptions = {
	config: EmailConfig;
	accountId: number;
	session?: ImapSession | null;
};

function identitiesFromConfig(config: EmailConfig): Address[] {
	const auth = config.auth;
	const user =
		'user' in auth
			? auth.user
			: 'mechanism' in auth
				? (auth.credentials.user ?? auth.credentials.username ?? '')
				: '';
	return user ? [{ address: user }] : [];
}

export function createWriteSurface(
	db: EmailDb,
	options: CreateWriteSurfaceOptions,
): EmailWriteSurface {
	const { config, accountId, session } = options;

	function requireSession(): ImapSession {
		if (!session) {
			throw new EmailUnsupportedError(
				'write_network',
				'Connect via Mailbox — IMAP session not wired',
			);
		}
		return session;
	}

	async function requireSelectedFolder(folder: string): Promise<void> {
		const imap = requireSession();
		if (imap.selectedFolder !== folder) {
			await imap.selectFolder(folder);
		}
	}

	async function sendComposed(composed: Buffer): Promise<{ messageId: string }> {
		const raw = composed.toString('utf8');
		const fromMatch = raw.match(/^From:\s*(.+?)$/m);
		const fromAddr = fromMatch?.[1]?.match(/<(.+?)>|(\S+@\S+)/)?.[1] ?? '';
		const toMatch = [...raw.matchAll(/^(?:To|Cc|Bcc):\s*(.+?)$/gm)];
		const toAddrs = toMatch.flatMap((m) =>
			(m[1] ?? '').split(',').map((a) => (a.match(/<(.+?)>|(\S+@\S+)/)?.[1] ?? a).trim()),
		);
		await smtpSend(config, composed, { from: fromAddr, to: toAddrs });
		const msgIdMatch = raw.match(/^Message-ID:\s*(.+?)$/im);
		return { messageId: msgIdMatch?.[1]?.trim() ?? generateMessageId('local') };
	}

	return {
		markRead: async (folder: string, uids: number[]) => {
			await requireSelectedFolder(folder);
			await requireSession().storeFlags(uids, '+FLAGS.SILENT', ['\\Seen']);
		},
		markUnread: async (folder: string, uids: number[]) => {
			await requireSelectedFolder(folder);
			await requireSession().storeFlags(uids, '-FLAGS.SILENT', ['\\Seen']);
		},
		star: async (folder: string, uids: number[]) => {
			await requireSelectedFolder(folder);
			await requireSession().storeFlags(uids, '+FLAGS.SILENT', ['\\Flagged']);
		},
		unstar: async (folder: string, uids: number[]) => {
			await requireSelectedFolder(folder);
			await requireSession().storeFlags(uids, '-FLAGS.SILENT', ['\\Flagged']);
		},
		markAnswered: async (folder: string, uids: number[]) => {
			await requireSelectedFolder(folder);
			await requireSession().storeFlags(uids, '+FLAGS.SILENT', ['\\Answered']);
		},
		copyTo: async (folder: string, uids: number[], destination: string) => {
			await requireSelectedFolder(folder);
			await requireSession().copyMessages(uids, destination);
		},
		moveTo: async (folder: string, uids: number[], destination: string) => {
			await requireSelectedFolder(folder);
			await requireSession().moveMessages(uids, destination);
		},
		archive: async (folder: string, uids: number[]) => {
			const folders = store.listFolders(db, accountId);
			const archiveFolder = folders.find((f) => f.role === 'archive');
			if (!archiveFolder) throw new EmailUnsupportedError('archive', 'No archive folder found');
			await requireSelectedFolder(folder);
			await requireSession().moveMessages(uids, archiveFolder.path);
		},
		trash: async (folder: string, uids: number[]) => {
			const folders = store.listFolders(db, accountId);
			const trashFolder = folders.find((f) => f.role === 'trash');
			if (!trashFolder) throw new EmailUnsupportedError('trash', 'No trash folder found');
			await requireSelectedFolder(folder);
			await requireSession().moveMessages(uids, trashFolder.path);
		},
		moveToJunk: async (folder: string, uids: number[]) => {
			const folders = store.listFolders(db, accountId);
			const junkFolder = folders.find((f) => f.role === 'junk');
			if (!junkFolder) throw new EmailUnsupportedError('junk', 'No junk folder found');
			await requireSelectedFolder(folder);
			await requireSession().moveMessages(uids, junkFolder.path);
		},
		markNotJunk: async (folder: string, uids: number[], destination?: string) => {
			await requireSelectedFolder(folder);
			const folders = store.listFolders(db, accountId);
			const dest = destination ?? folders.find((f) => f.role === 'inbox')?.path ?? 'INBOX';
			await requireSession().storeFlags(uids, '-FLAGS.SILENT', ['\\Junk']);
			await requireSession().moveMessages(uids, dest);
		},
		delete: async (folder: string, uids: number[]) => {
			await requireSelectedFolder(folder);
			await requireSession().storeFlags(uids, '+FLAGS.SILENT', ['\\Deleted']);
			await requireSession().uidExpunge(uids);
		},
		addLabels: async (folder: string, uids: number[], labels: string[]) => {
			await requireSelectedFolder(folder);
			await requireSession().storeFlags(uids, '+FLAGS.SILENT', labels);
		},
		removeLabels: async (folder: string, uids: number[], labels: string[]) => {
			await requireSelectedFolder(folder);
			await requireSession().storeFlags(uids, '-FLAGS.SILENT', labels);
		},
		setLabels: async (folder: string, uids: number[], labels: string[]) => {
			await requireSelectedFolder(folder);
			await requireSession().storeFlags(uids, 'FLAGS.SILENT', labels);
		},
		send: async (input: ComposeInput) => {
			requireSession(); // ensures Mailbox.connect() has been called
			const composed = composeMessage(input);
			return sendComposed(composed);
		},
		reply: async (folder: string, uid: number, input: ReplyInput) => {
			const f = store.getFolder(db, accountId, folder);
			if (!f) throw new EmailNotFoundError(`Folder not found: ${folder}`);
			const m = store.getMessage(db, f.id, uid);
			if (!m) throw new EmailNotFoundError(`Message uid ${uid} not found`);
			const body = store.getBody(db, m.id);
			const identities = identitiesFromConfig(config);
			const composeInput = composeReply(
				{ ...m, textPlain: body?.textPlain ?? null, textHtml: body?.textHtml ?? null },
				input,
				identities,
			);
			const composed = composeMessage(composeInput);
			return sendComposed(composed);
		},
		forward: async (folder: string, uid: number, input: ForwardInput) => {
			const f = store.getFolder(db, accountId, folder);
			if (!f) throw new EmailNotFoundError(`Folder not found: ${folder}`);
			const m = store.getMessage(db, f.id, uid);
			if (!m) throw new EmailNotFoundError(`Message uid ${uid} not found`);
			const body = store.getBody(db, m.id);
			const composeInput = composeForward(
				{ ...m, textPlain: body?.textPlain ?? null, textHtml: body?.textHtml ?? null },
				input,
			);
			const composed = composeMessage(composeInput);
			return sendComposed(composed);
		},
		saveDraft: async (input: ComposeInput) => {
			const imap = requireSession();
			const folders = store.listFolders(db, accountId);
			const draftsFolder = folders.find((f) => f.role === 'drafts');
			if (!draftsFolder) throw new EmailUnsupportedError('drafts', 'No drafts folder found');
			const composed = composeMessage(input);
			const result = await imap.appendMessage(draftsFolder.path, composed, ['\\Draft']);
			return { uid: result.uid ?? 0 };
		},
		updateDraft: async (uid: number, input: ComposeInput) => {
			const imap = requireSession();
			const folders = store.listFolders(db, accountId);
			const draftsFolder = folders.find((f) => f.role === 'drafts');
			if (!draftsFolder) throw new EmailUnsupportedError('drafts', 'No drafts folder found');
			await imap.selectFolder(draftsFolder.path);
			await imap.storeFlags([uid], '+FLAGS.SILENT', ['\\Deleted']);
			await imap.uidExpunge([uid]);
			const composed = composeMessage(input);
			const result = await imap.appendMessage(draftsFolder.path, composed, ['\\Draft']);
			return { uid: result.uid ?? 0 };
		},
		sendDraft: async (uid: number) => {
			const folders = store.listFolders(db, accountId);
			const draftsFolder = folders.find((f) => f.role === 'drafts');
			if (!draftsFolder) throw new EmailUnsupportedError('drafts', 'No drafts folder found');
			const imap = requireSession();
			const results = await imap.fetchMessages(String(uid), ['BODY.PEEK[]']);
			const result = results[0];
			if (!result) throw new EmailNotFoundError(`Draft uid ${uid} not found`);
			const raw = result.bodySections.get('') ?? result.bodySections.get('BODY[]');
			if (!raw) throw new EmailNotFoundError('Draft body missing');
			const composed = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as string);
			const sent = await sendComposed(composed);
			// Remove from drafts
			await imap.selectFolder(draftsFolder.path);
			await imap.storeFlags([uid], '+FLAGS.SILENT', ['\\Deleted']);
			await imap.uidExpunge([uid]);
			return sent;
		},
		createFolder: async (path: string) => {
			await requireSession().createFolder(path);
		},
		renameFolder: async (oldPath: string, newPath: string) => {
			await requireSession().renameFolder(oldPath, newPath);
		},
		deleteFolder: async (path: string) => {
			await requireSession().deleteFolder(path);
		},
		subscribeFolder: async (path: string) => {
			await requireSession().subscribeFolder(path);
		},
		unsubscribeFolder: async (path: string) => {
			await requireSession().unsubscribeFolder(path);
		},
		exportEml: async (folder: string, uid: number) => {
			await requireSelectedFolder(folder);
			const results = await requireSession().fetchMessages(String(uid), ['BODY.PEEK[]']);
			const result = results[0];
			if (!result) throw new EmailNotFoundError(`Message uid ${uid} not found`);
			const raw = result.bodySections.get('') ?? result.bodySections.get('BODY[]');
			if (!raw) throw new EmailNotFoundError('Message body missing');
			return Buffer.isBuffer(raw) ? raw : Buffer.from(raw as string);
		},
		importEml: async (folder: string, eml: Buffer, flags?: string[]) => {
			return requireSession().appendMessage(folder, eml, flags);
		},
	};
}
