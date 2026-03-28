import { EventEmitter } from 'node:events';
import * as net from 'node:net';
import type { Duplex } from 'node:stream';
import * as tls from 'node:tls';
import * as zlib from 'node:zlib';
import { DEFAULT_CONNECTION_TIMEOUT, DEFAULT_KEEPALIVE_INTERVAL } from '../types/defaults.ts';

export interface ImapConnectionConfig {
	host: string;
	port: number;
	tls?: boolean;
	timeout?: number;
	keepaliveInterval?: number;
}

export class ImapConnection extends EventEmitter {
	readonly #config: ImapConnectionConfig;
	#socket: Duplex | null = null;
	#connected = false;
	#keepaliveTimer: NodeJS.Timeout | null = null;

	constructor(config: ImapConnectionConfig) {
		super();
		this.#config = config;
	}

	get socket(): Duplex {
		if (!this.#socket) throw new Error('Not connected');
		return this.#socket as Duplex;
	}

	get isConnected(): boolean {
		return this.#connected;
	}

	connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			const timeout = this.#config.timeout ?? DEFAULT_CONNECTION_TIMEOUT;
			const useTls = this.#config.tls !== false;

			const onError = (err: Error) => {
				this.#connected = false;
				this.emit('error', err);
				reject(err);
			};

			if (useTls) {
				const sock = tls.connect({
					host: this.#config.host,
					port: this.#config.port,
					timeout,
				});
				sock.once('secureConnect', () => {
					this.#socket = sock;
					this.#connected = true;
					this.#setupEvents(sock);
					this.#startKeepalive();
					this.emit('connected');
					resolve();
				});
				sock.once('error', onError);
			} else {
				const sock = net.connect({
					host: this.#config.host,
					port: this.#config.port,
					timeout,
				});
				sock.once('connect', () => {
					this.#socket = sock as unknown as Duplex;
					this.#connected = true;
					this.#setupEvents(sock as unknown as Duplex);
					this.#startKeepalive();
					this.emit('connected');
					resolve();
				});
				sock.once('error', onError);
			}
		});
	}

	disconnect(): Promise<void> {
		this.#stopKeepalive();
		this.#connected = false;
		return new Promise((resolve) => {
			if (!this.#socket) {
				resolve();
				return;
			}
			const s = this.#socket;
			this.#socket = null;
			s.end(() => {
				this.emit('disconnected');
				resolve();
			});
		});
	}

	upgrade(): Promise<void> {
		if (!this.#socket) return Promise.reject(new Error('Not connected'));
		const existing = this.#socket;
		return new Promise((resolve, reject) => {
			const upgraded = tls.connect({
				socket: existing as unknown as net.Socket,
				host: this.#config.host,
			});
			upgraded.once('secureConnect', () => {
				this.#socket = upgraded;
				// Re-wire data forwarding on the new socket.
				upgraded.on('data', (chunk: Buffer) => this.emit('data', chunk));
				resolve();
			});
			upgraded.once('error', reject);
		});
	}

	/**
	 * Negotiate COMPRESS=DEFLATE: wrap the socket read/write paths with
	 * zlib inflate/deflate streams.  Must be called immediately after the
	 * server sends the COMPRESS OK response — before the server starts sending
	 * compressed bytes.
	 */
	wrapCompression(): void {
		const s = this.#socket;
		if (!s) return;

		const inflate = zlib.createInflateRaw();
		const deflate = zlib.createDeflateRaw({ flush: zlib.constants.Z_SYNC_FLUSH });

		// Incoming: raw socket bytes → inflate → 'data' event (unchanged API)
		s.removeAllListeners('data');
		s.on('data', (chunk: Buffer) => inflate.write(chunk));
		inflate.on('data', (chunk: Buffer) => this.emit('data', chunk));
		inflate.on('error', (err) => this.emit('error', err));

		// Outgoing: callers call socket.write() → deflate → raw socket
		const origWrite = s.write.bind(s) as typeof s.write;
		deflate.on('data', (chunk: Buffer) => origWrite(chunk));
		deflate.on('error', (err) => this.emit('error', err));

		// Replace the write method so the dispatcher's socket.write calls go
		// through deflate automatically.
		const socketAny = s as unknown as Record<string, unknown>;
		socketAny.write = (
			chunk: Buffer | string,
			encodingOrCb?: BufferEncoding | ((err?: Error | null) => void),
			cb?: (err?: Error | null) => void,
		): boolean => {
			const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
			if (typeof encodingOrCb === 'function') {
				deflate.write(buffer, encodingOrCb);
			} else {
				deflate.write(buffer, cb ?? (() => {}));
			}
			return true;
		};
	}

	#setupEvents(sock: Duplex): void {
		// Forward socket data to this EventEmitter so session can wire dispatcher.
		sock.on('data', (chunk: Buffer) => this.emit('data', chunk));

		sock.once('close', () => {
			this.#connected = false;
			this.#stopKeepalive();
			this.emit('disconnected');
		});
		sock.once('timeout', () => {
			this.emit('timeout');
		});
	}

	#startKeepalive(): void {
		const interval = this.#config.keepaliveInterval ?? DEFAULT_KEEPALIVE_INTERVAL;
		this.#keepaliveTimer = setInterval(() => {
			// Caller (dispatcher) will send NOOP
			this.emit('keepalive');
		}, interval);
	}

	#stopKeepalive(): void {
		if (this.#keepaliveTimer) {
			clearInterval(this.#keepaliveTimer);
			this.#keepaliveTimer = null;
		}
	}
}
