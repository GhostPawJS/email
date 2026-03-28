import { decodeBodyStructure } from '../mime/decode_bodystructure.ts';
import { decodeEnvelope } from '../mime/decode_envelope.ts';
import type { FetchResult } from '../types/imap_response.ts';
import { type RawArg, raw } from './command_builder.ts';
import type { ImapDispatcher } from './dispatcher.ts';

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

function parseFetchData(data: unknown): Partial<FetchResult> {
	// data is an array from response parser; the FETCH paren group becomes a nested array
	// e.g. data = [["UID", 42, "FLAGS", ["\\Seen"], "BODY", "[]", Buffer(rawBytes)]]
	const rawArr = Array.isArray(data) ? (data as unknown[]) : [];
	const arr = rawArr.length === 1 && Array.isArray(rawArr[0]) ? (rawArr[0] as unknown[]) : rawArr;
	const result: Partial<FetchResult> = {
		uid: 0,
		flags: [],
		internalDate: null,
		size: null,
		envelope: null,
		bodyStructure: null,
		modSeq: null,
		bodySections: new Map(),
	};
	let i = 0;
	while (i < arr.length) {
		const key = tokStr(arr[i]).toUpperCase();
		i++;
		if (i >= arr.length) break;

		// BODY section: collectItems renders 'BODY[]' as two items: atom 'BODY' followed
		// by bracket string '[]', with the literal data as the third item.
		// e.g. ['BODY', '[]', Buffer(rawBytes)] or ['BODY', '[TEXT]', Buffer(bytes)]
		if (key === 'BODY' && typeof arr[i] === 'string' && (arr[i] as string).startsWith('[')) {
			const spec = arr[i] as string;
			i++;
			const closeBracket = spec.lastIndexOf(']');
			const sectionName = spec.slice(1, closeBracket); // '' for 'BODY[]'
			const bodyData = arr[i];
			if (bodyData !== undefined) {
				const buf = Buffer.isBuffer(bodyData) ? bodyData : Buffer.from(String(bodyData));
				result.bodySections?.set(sectionName, buf);
				i++;
			}
			continue;
		}

		const val = arr[i];
		i++;

		if (key === 'UID') result.uid = tokNum(val) ?? 0;
		if (key === 'FLAGS' && Array.isArray(val)) {
			result.flags = (val as unknown[]).map(tokStr);
		}
		if (key === 'INTERNALDATE') result.internalDate = tokStr(val);
		if (key === 'RFC822.SIZE') result.size = tokNum(val);
		if (key === 'ENVELOPE' && Array.isArray(val)) {
			result.envelope = decodeEnvelope(val as unknown[]);
		}
		if (key === 'BODYSTRUCTURE' && Array.isArray(val)) {
			result.bodyStructure = decodeBodyStructure(val as unknown[]);
		}
		if (key === 'MODSEQ' && Array.isArray(val)) {
			result.modSeq = tokNum((val as unknown[])[0]);
		}
	}
	return result;
}

export async function fetchMessages(
	dispatcher: ImapDispatcher,
	range: string,
	items: string[],
): Promise<FetchResult[]> {
	const itemStr = `(${items.join(' ')})`;
	const res = await dispatcher.execute('UID FETCH', [raw(range), raw(itemStr)]);
	const results: FetchResult[] = [];
	for (const u of res.untagged) {
		if (u.type !== 'FETCH') continue;
		const partial = parseFetchData(u.data);
		results.push({
			uid: partial.uid ?? 0,
			flags: partial.flags ?? [],
			internalDate: partial.internalDate ?? null,
			size: partial.size ?? null,
			envelope: partial.envelope ?? null,
			bodyStructure: partial.bodyStructure ?? null,
			modSeq: partial.modSeq ?? null,
			bodySections: partial.bodySections ?? new Map(),
		});
	}
	return results;
}

export async function searchMessages(dispatcher: ImapDispatcher, query: string): Promise<number[]> {
	const res = await dispatcher.execute('UID SEARCH', [raw(query)]);
	const uids: number[] = [];
	for (const u of res.untagged) {
		if (u.type !== 'SEARCH') continue;
		const data = Array.isArray(u.data) ? (u.data as unknown[]) : [];
		for (const v of data) {
			const n = tokNum(v);
			if (n !== null) uids.push(n);
		}
	}
	return uids;
}

export async function storeFlags(
	dispatcher: ImapDispatcher,
	uids: number[],
	action: '+FLAGS.SILENT' | '-FLAGS.SILENT' | 'FLAGS.SILENT',
	flags: string[],
): Promise<void> {
	await dispatcher.execute('UID STORE', [
		raw(uids.join(',')),
		raw(action),
		raw(`(${flags.join(' ')})`),
	]);
}

export async function copyMessages(
	dispatcher: ImapDispatcher,
	uids: number[],
	dest: string,
): Promise<{ uidMapping?: Record<number, number> }> {
	const res = await dispatcher.execute('UID COPY', [raw(uids.join(',')), dest]);
	const code = res.tagged.code;
	if (code?.code === 'COPYUID' && Array.isArray(code.value)) {
		const vals = code.value as string[];
		return { uidMapping: Object.fromEntries(vals.slice(1).map((v, i) => [i, Number(v)])) };
	}
	return {};
}

export async function moveMessages(
	dispatcher: ImapDispatcher,
	uids: number[],
	dest: string,
	hasMove: boolean,
): Promise<void> {
	if (hasMove) {
		await dispatcher.execute('UID MOVE', [raw(uids.join(',')), dest]);
	} else {
		await copyMessages(dispatcher, uids, dest);
		await storeFlags(dispatcher, uids, '+FLAGS.SILENT', ['\\Deleted']);
		await expungeAll(dispatcher);
	}
}

export async function expungeAll(dispatcher: ImapDispatcher): Promise<void> {
	await dispatcher.execute('EXPUNGE');
}

export async function uidExpunge(dispatcher: ImapDispatcher, uids: number[]): Promise<void> {
	await dispatcher.execute('UID EXPUNGE', [raw(uids.join(','))]);
}

export async function appendMessage(
	dispatcher: ImapDispatcher,
	folder: string,
	message: Buffer,
	flags?: string[],
	internalDate?: string,
): Promise<{ uid?: number }> {
	// Build pre-literal args: mailbox, optional flags, optional datetime.
	// The literal size specifier {N} is appended by executeWithLiteral — it must
	// NOT be passed through encodeArg which would quote the braces.
	const preArgs: (string | RawArg)[] = [folder];
	if (flags?.length) preArgs.push(raw(`(${flags.join(' ')})`));
	if (internalDate) preArgs.push(internalDate);

	const res = await dispatcher.executeWithLiteral('APPEND', preArgs, message);
	const code = res.tagged.code;
	if (code?.code === 'APPENDUID' && Array.isArray(code.value)) {
		const vals = code.value as string[];
		return { uid: Number(vals[1]) };
	}
	return {};
}
