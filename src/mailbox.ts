import type { EmailDb } from './database.ts';
import { ImapSession } from './imap/session.ts';
import { createNetworkSurface } from './network.ts';
import { createReadSurface } from './read.ts';
import { init } from './runtime.ts';
import { upsertAccount } from './store/index.ts';
import type { EmailConfig } from './types/config.ts';
import type { EmailNetworkSurface, EmailReadSurface, EmailWriteSurface } from './types/surfaces.ts';
import { createWriteSurface } from './write.ts';

export class Mailbox {
	readonly #config: EmailConfig;
	#db: EmailDb | null = null;
	#session: ImapSession | null = null;
	#read: EmailReadSurface | null = null;
	#write: EmailWriteSurface | null = null;
	#network: EmailNetworkSurface | null = null;

	constructor(config: EmailConfig) {
		this.#config = config;
	}

	async connect(): Promise<void> {
		const { db } = init(this.#config);
		this.#db = db;

		const auth = this.#config.auth;
		const authUser =
			'user' in auth
				? auth.user
				: 'mechanism' in auth
					? (auth.credentials.user ?? auth.credentials.username ?? 'user')
					: 'user';

		const account = upsertAccount(db, {
			host: this.#config.imap.host,
			port: this.#config.imap.port,
			username: authUser,
		});

		const session = new ImapSession(this.#config);
		await session.connect();
		this.#session = session;

		this.#read = createReadSurface(db, account.id, { session });
		this.#write = createWriteSurface(db, {
			config: this.#config,
			accountId: account.id,
			session,
		});
		this.#network = createNetworkSurface(db, {
			accountId: account.id,
			session,
		});
	}

	async disconnect(): Promise<void> {
		await this.#session?.disconnect();
		this.#session = null;
		this.#db?.close();
		this.#db = null;
		this.#read = null;
		this.#write = null;
		this.#network = null;
	}

	isConnected(): boolean {
		return this.#db !== null;
	}

	get read(): EmailReadSurface {
		if (!this.#read) throw new Error('Mailbox not connected');
		return this.#read;
	}

	get write(): EmailWriteSurface {
		if (!this.#write) throw new Error('Mailbox not connected');
		return this.#write;
	}

	get network(): EmailNetworkSurface {
		if (!this.#network) throw new Error('Mailbox not connected');
		return this.#network;
	}
}
