import type { SelectedFolder } from '../types/capability.ts';
import type { Folder, FolderStatus } from '../types/folder.ts';
import type { UntaggedResponse } from '../types/imap_response.ts';
import { raw } from './command_builder.ts';
import type { ImapDispatcher } from './dispatcher.ts';
import { detectFolderRole } from './folder_role.ts';

function tokStr(v: unknown): string {
	if (v === null || v === undefined) return '';
	if (Buffer.isBuffer(v)) return v.toString('utf8');
	return String(v);
}

function tokNum(v: unknown): number | null {
	if (typeof v === 'number') return v;
	if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v);
	return null;
}

function parseListResponse(untagged: UntaggedResponse[]): Folder[] {
	const folders: Folder[] = [];
	for (const r of untagged) {
		if (r.type !== 'LIST') continue;
		const data = Array.isArray(r.data) ? (r.data as unknown[]) : [];
		// data is [flagsList, delimiter, path] where flagsList may be an array
		const flagsRaw = data[0];
		const flags: string[] = Array.isArray(flagsRaw) ? (flagsRaw as unknown[]).map(tokStr) : [];
		const delimiter = tokStr(data[1] as string | null);
		const path = tokStr(data[2] as string | null);
		if (!path) continue;
		folders.push({
			id: 0,
			accountId: 0,
			path,
			delimiter: delimiter || '/',
			role: detectFolderRole(flags, path),
			uidValidity: null,
			uidNext: null,
			highestModSeq: null,
			messageCount: null,
			unseenCount: null,
			lastSyncedAt: null,
		});
	}
	return folders;
}

export async function listFolders(dispatcher: ImapDispatcher): Promise<Folder[]> {
	// Pass unquoted args — encodeArg handles the quoting.
	// '' → ""  (empty reference = all namespaces)
	// '*' → "*" (pattern matching all mailboxes)
	const res = await dispatcher.execute('LIST', ['', '*']);
	return parseListResponse(res.untagged);
}

export async function selectFolder(
	dispatcher: ImapDispatcher,
	path: string,
	qresync?: { uidValidity: number; highestModSeq: number; knownUids: string },
): Promise<SelectedFolder> {
	const args = qresync
		? [
				path,
				raw(`(QRESYNC (${qresync.uidValidity} ${qresync.highestModSeq} ${qresync.knownUids}))`),
			]
		: [path];
	const res = await dispatcher.execute('SELECT', args);
	let exists = 0;
	let recent = 0;
	let flags: string[] = [];
	let permanentFlags: string[] = [];
	let uidValidity = 0;
	let uidNext = 0;
	let highestModSeq: number | null = null;
	for (const u of res.untagged) {
		if (u.type === 'EXISTS' && u.number !== null) exists = u.number;
		if (u.type === 'RECENT' && u.number !== null) recent = u.number;
		if (u.type === 'FLAGS') {
			flags = Array.isArray(u.data) ? (u.data as unknown[]).map(tokStr) : [];
		}
		if (u.code?.code === 'PERMANENTFLAGS') {
			permanentFlags = Array.isArray(u.code.value) ? u.code.value : [];
		}
		if (u.code?.code === 'UIDVALIDITY') uidValidity = tokNum(u.code.value) ?? 0;
		if (u.code?.code === 'UIDNEXT') uidNext = tokNum(u.code.value) ?? 0;
		if (u.code?.code === 'HIGHESTMODSEQ') highestModSeq = tokNum(u.code.value);
	}
	return { exists, recent, flags, permanentFlags, uidValidity, uidNext, highestModSeq };
}

export async function examineFolder(
	dispatcher: ImapDispatcher,
	path: string,
): Promise<SelectedFolder> {
	const res = await dispatcher.execute('EXAMINE', [path]);
	let exists = 0;
	let recent = 0;
	let flags: string[] = [];
	let permanentFlags: string[] = [];
	let uidValidity = 0;
	let uidNext = 0;
	let highestModSeq: number | null = null;
	for (const u of res.untagged) {
		if (u.type === 'EXISTS' && u.number !== null) exists = u.number;
		if (u.type === 'RECENT' && u.number !== null) recent = u.number;
		if (u.type === 'FLAGS') {
			flags = Array.isArray(u.data) ? (u.data as unknown[]).map(tokStr) : [];
		}
		if (u.code?.code === 'PERMANENTFLAGS') {
			permanentFlags = Array.isArray(u.code.value) ? u.code.value : [];
		}
		if (u.code?.code === 'UIDVALIDITY') uidValidity = tokNum(u.code.value) ?? 0;
		if (u.code?.code === 'UIDNEXT') uidNext = tokNum(u.code.value) ?? 0;
		if (u.code?.code === 'HIGHESTMODSEQ') highestModSeq = tokNum(u.code.value);
	}
	return { exists, recent, flags, permanentFlags, uidValidity, uidNext, highestModSeq };
}

export async function createImapFolder(dispatcher: ImapDispatcher, path: string): Promise<void> {
	await dispatcher.execute('CREATE', [path]);
}

export async function deleteImapFolder(dispatcher: ImapDispatcher, path: string): Promise<void> {
	await dispatcher.execute('DELETE', [path]);
}

export async function renameImapFolder(
	dispatcher: ImapDispatcher,
	oldPath: string,
	newPath: string,
): Promise<void> {
	await dispatcher.execute('RENAME', [oldPath, newPath]);
}

export async function subscribeImapFolder(dispatcher: ImapDispatcher, path: string): Promise<void> {
	await dispatcher.execute('SUBSCRIBE', [path]);
}

export async function unsubscribeImapFolder(
	dispatcher: ImapDispatcher,
	path: string,
): Promise<void> {
	await dispatcher.execute('UNSUBSCRIBE', [path]);
}

export async function statusFolder(
	dispatcher: ImapDispatcher,
	path: string,
): Promise<FolderStatus> {
	const res = await dispatcher.execute('STATUS', [
		path,
		raw('(MESSAGES UNSEEN UIDNEXT UIDVALIDITY HIGHESTMODSEQ)'),
	]);
	let messages = 0;
	let unseen = 0;
	let uidNext = 0;
	let uidValidity = 0;
	let highestModSeq: number | null = null;
	for (const u of res.untagged) {
		if (u.type === 'STATUS' && Array.isArray(u.data)) {
			const arr = u.data as unknown[];
			for (let i = 0; i + 1 < arr.length; i += 2) {
				const k = tokStr(arr[i]).toUpperCase();
				const v = tokNum(arr[i + 1]);
				if (k === 'MESSAGES' && v !== null) messages = v;
				if (k === 'UNSEEN' && v !== null) unseen = v;
				if (k === 'UIDNEXT' && v !== null) uidNext = v;
				if (k === 'UIDVALIDITY' && v !== null) uidValidity = v;
				if (k === 'HIGHESTMODSEQ') highestModSeq = v;
			}
		}
	}
	return { messages, unseen, uidNext, uidValidity, highestModSeq };
}
