import type { NegotiatedExtensions, SelectedFolder } from '../types/capability.ts';
import type { EmailConfig } from '../types/config.ts';
import { DEFAULT_COMPRESS } from '../types/defaults.ts';
import type { Folder, FolderStatus } from '../types/folder.ts';
import type { FetchResult } from '../types/imap_response.ts';
import { authenticate } from './auth.ts';
import { negotiateExtensions, parseCapabilities } from './capabilities.ts';
import { raw } from './command_builder.ts';
import { enableCompression } from './compress.ts';
import { ImapConnection } from './connection.ts';
import { ImapDispatcher } from './dispatcher.ts';
import {
	createImapFolder,
	deleteImapFolder,
	examineFolder,
	listFolders as listFoldersCmd,
	renameImapFolder,
	selectFolder as selectFolderCmd,
	statusFolder,
	subscribeImapFolder,
	unsubscribeImapFolder,
} from './folder_commands.ts';
import type { IdleEvent } from './idle.ts';
import { idle } from './idle.ts';
import {
	appendMessage,
	copyMessages,
	expungeAll,
	fetchMessages,
	moveMessages,
	searchMessages as searchMessagesCmd,
	storeFlags,
	uidExpunge,
} from './message_commands.ts';
import { createTagGenerator } from './tag_generator.ts';
import { ImapTokenizer } from './tokenizer.ts';

export class ImapSession {
	readonly #config: EmailConfig;
	#connection: ImapConnection | null = null;
	#dispatcher: ImapDispatcher | null = null;
	#capabilities: Set<string> = new Set();
	#extensions: NegotiatedExtensions = negotiateExtensions(new Set());
	#selectedFolder: string | null = null;

	constructor(config: EmailConfig) {
		this.#config = config;
	}

	get capabilities(): Set<string> {
		return this.#capabilities;
	}

	get extensions(): NegotiatedExtensions {
		return this.#extensions;
	}

	get selectedFolder(): string | null {
		return this.#selectedFolder;
	}

	get dispatcher(): ImapDispatcher {
		if (!this.#dispatcher) throw new Error('ImapSession not connected');
		return this.#dispatcher;
	}

	async connect(): Promise<void> {
		const conn = new ImapConnection({
			host: this.#config.imap.host,
			port: this.#config.imap.port,
			tls: this.#config.imap.tls !== false,
		});
		await conn.connect();

		const tokenizer = new ImapTokenizer();
		const tagGen = createTagGenerator();
		// Use conn.socket here — it is valid after connect().
		const dispatcher = new ImapDispatcher(conn.socket, tokenizer, tagGen);

		// Wire socket data → dispatcher now that both are ready.
		conn.on('data', (chunk: Buffer) => dispatcher.receive(chunk));

		this.#connection = conn;
		this.#dispatcher = dispatcher;

		// CAPABILITY
		const capRes = await dispatcher.execute('CAPABILITY');
		const capLine = capRes.untagged[0]?.data;
		const capStr = Array.isArray(capLine)
			? (capLine as unknown[]).map(String).join(' ')
			: String(capLine ?? '');
		this.#capabilities = parseCapabilities(`CAPABILITY ${capStr}`);
		this.#extensions = negotiateExtensions(this.#capabilities);

		// STARTTLS if needed
		if (this.#config.imap.tls === false && this.#capabilities.has('STARTTLS')) {
			await dispatcher.execute('STARTTLS');
			await conn.upgrade();
			const cap2 = await dispatcher.execute('CAPABILITY');
			const capLine2 = cap2.untagged[0]?.data;
			const capStr2 = Array.isArray(capLine2)
				? (capLine2 as unknown[]).map(String).join(' ')
				: String(capLine2 ?? '');
			this.#capabilities = parseCapabilities(`CAPABILITY ${capStr2}`);
			this.#extensions = negotiateExtensions(this.#capabilities);
		}

		// Authenticate
		await authenticate(dispatcher, this.#capabilities, this.#config.auth);

		// ID — some servers gate features behind client identification (RFC 2971)
		if (this.#extensions.id) {
			await dispatcher.execute('ID', [raw('("name" "ghostpaw-email" "version" "1.0.0")')]);
		}

		// QRESYNC
		if (this.#extensions.qresync) {
			await dispatcher.execute('ENABLE', ['QRESYNC']);
		}

		// Compression — send the command; if the server accepts, wrap the socket
		// with zlib inflate/deflate immediately before any further bytes arrive.
		const compress = DEFAULT_COMPRESS;
		if (compress && this.#extensions.compress) {
			const ok = await enableCompression(dispatcher);
			if (ok) conn.wrapCompression();
		}
	}

	async disconnect(): Promise<void> {
		try {
			await this.#dispatcher?.execute('LOGOUT');
		} catch {
			// ignore
		}
		this.#dispatcher?.destroy();
		await this.#connection?.disconnect();
		this.#dispatcher = null;
		this.#connection = null;
	}

	async listFolders(): Promise<Folder[]> {
		return listFoldersCmd(this.dispatcher);
	}

	async selectFolder(path: string): Promise<SelectedFolder> {
		const sel = await selectFolderCmd(this.dispatcher, path);
		this.#selectedFolder = path;
		return sel;
	}

	async examineFolder(path: string): Promise<SelectedFolder> {
		return examineFolder(this.dispatcher, path);
	}

	async createFolder(path: string): Promise<void> {
		return createImapFolder(this.dispatcher, path);
	}

	async deleteFolder(path: string): Promise<void> {
		return deleteImapFolder(this.dispatcher, path);
	}

	async renameFolder(oldPath: string, newPath: string): Promise<void> {
		return renameImapFolder(this.dispatcher, oldPath, newPath);
	}

	async subscribeFolder(path: string): Promise<void> {
		return subscribeImapFolder(this.dispatcher, path);
	}

	async unsubscribeFolder(path: string): Promise<void> {
		return unsubscribeImapFolder(this.dispatcher, path);
	}

	async statusFolder(path: string): Promise<FolderStatus> {
		return statusFolder(this.dispatcher, path);
	}

	async fetchMessages(range: string, items: string[]): Promise<FetchResult[]> {
		return fetchMessages(this.dispatcher, range, items);
	}

	async searchMessages(query: string): Promise<number[]> {
		return searchMessagesCmd(this.dispatcher, query);
	}

	async storeFlags(
		uids: number[],
		action: '+FLAGS.SILENT' | '-FLAGS.SILENT' | 'FLAGS.SILENT',
		flags: string[],
	): Promise<void> {
		return storeFlags(this.dispatcher, uids, action, flags);
	}

	async copyMessages(
		uids: number[],
		dest: string,
	): Promise<{ uidMapping?: Record<number, number> }> {
		return copyMessages(this.dispatcher, uids, dest);
	}

	async moveMessages(uids: number[], dest: string): Promise<void> {
		return moveMessages(this.dispatcher, uids, dest, this.#extensions.move);
	}

	async expunge(): Promise<void> {
		return expungeAll(this.dispatcher);
	}

	async uidExpunge(uids: number[]): Promise<void> {
		return uidExpunge(this.dispatcher, uids);
	}

	async appendMessage(
		folder: string,
		message: Buffer,
		flags?: string[],
		internalDate?: string,
	): Promise<{ uid?: number }> {
		return appendMessage(this.dispatcher, folder, message, flags, internalDate);
	}

	async *idle(options?: { signal?: AbortSignal }): AsyncGenerator<IdleEvent> {
		yield* idle(this.dispatcher, options);
	}
}
