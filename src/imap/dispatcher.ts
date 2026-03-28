import type { Writable } from 'node:stream';
import { EmailConnectionError, EmailProtocolError } from '../errors.ts';
import type { TaggedResponse, UntaggedResponse } from '../types/imap_response.ts';
import { buildCommand, encodeArg } from './command_builder.ts';
import { parseResponse } from './response_parser.ts';
import type { ImapTokenizer } from './tokenizer.ts';

type PendingCommand = {
	tag: string;
	resolve: (r: { tagged: TaggedResponse; untagged: UntaggedResponse[] }) => void;
	reject: (e: unknown) => void;
	untagged: UntaggedResponse[];
};

export class ImapDispatcher {
	#socket: Writable;
	#tokenizer: ImapTokenizer;
	#tagGen: () => string;
	#pending = new Map<string, PendingCommand>();
	#unsolicitedHandler: ((r: UntaggedResponse) => void) | null = null;
	/** Fired when the server sends a `+ ` continuation response. */
	#continuationHandler: ((text: string) => void) | null = null;
	#destroyed = false;

	constructor(socket: Writable, tokenizer: ImapTokenizer, tagGen: () => string) {
		this.#socket = socket;
		this.#tokenizer = tokenizer;
		this.#tagGen = tagGen;
	}

	/** Call this whenever new data arrives from the socket. */
	receive(chunk: Buffer): void {
		this.#tokenizer.feed(chunk);
		this.#drain();
	}

	#drain(): void {
		const tok = this.#tokenizer.readAll();
		// Split on CRLF boundaries into response lines
		const lines: (typeof tok)[] = [];
		let cur: typeof tok = [];
		for (const t of tok) {
			if (t.type === 'crlf') {
				if (cur.length) lines.push(cur);
				cur = [];
			} else {
				cur.push(t);
			}
		}
		if (cur.length) lines.push(cur);

		for (const line of lines) {
			const resp = parseResponse(line);
			if (resp.kind === 'tagged') {
				const pending = this.#pending.get(resp.tag);
				if (pending) {
					this.#pending.delete(resp.tag);
					if (resp.status === 'OK') {
						pending.resolve({ tagged: resp, untagged: pending.untagged });
					} else {
						pending.reject(
							new EmailProtocolError(`IMAP ${resp.status}: ${resp.text}`, {
								rawResponse: resp.text,
								tag: resp.tag,
							}),
						);
					}
				}
			} else if (resp.kind === 'continuation') {
				// Server is requesting literal data — fire the registered handler.
				const handler = this.#continuationHandler;
				this.#continuationHandler = null;
				if (handler) handler(resp.text);
			} else if (resp.kind === 'untagged') {
				// Route to current pending command(s), or to unsolicited handler
				let routed = false;
				for (const pending of this.#pending.values()) {
					pending.untagged.push(resp);
					routed = true;
					break; // route to the oldest pending command
				}
				if (!routed && this.#unsolicitedHandler) {
					this.#unsolicitedHandler(resp);
				}
			}
		}
	}

	execute(
		name: string,
		args?: string[],
	): Promise<{ tagged: TaggedResponse; untagged: UntaggedResponse[] }> {
		if (this.#destroyed) {
			return Promise.reject(new EmailConnectionError('Dispatcher destroyed'));
		}
		const tag = this.#tagGen();
		const cmd = buildCommand(tag, name, args);
		return new Promise((resolve, reject) => {
			const pending: PendingCommand = { tag, resolve, reject, untagged: [] };
			this.#pending.set(tag, pending);
			this.#socket.write(cmd, (err) => {
				if (err) {
					this.#pending.delete(tag);
					reject(new EmailConnectionError(`Write failed: ${err.message}`));
				}
			});
		});
	}

	/**
	 * Execute a command that ends with a synchronizing literal (`{N}\r\n`).
	 *
	 * Protocol flow (RFC 3501 §7.5):
	 *   C: A001 APPEND "Sent" (\Seen) {1234}\r\n
	 *   S: + go ahead\r\n
	 *   C: <1234 bytes of message>\r\n
	 *   S: A001 OK [APPENDUID …] Append completed
	 *
	 * @param name    - Command name (e.g. "APPEND").
	 * @param args    - Arguments before the literal (folder, flags, datetime, …).
	 * @param literal - The raw bytes to upload as the literal.
	 */
	executeWithLiteral(
		name: string,
		args: string[],
		literal: Buffer,
	): Promise<{ tagged: TaggedResponse; untagged: UntaggedResponse[] }> {
		if (this.#destroyed) {
			return Promise.reject(new EmailConnectionError('Dispatcher destroyed'));
		}
		const tag = this.#tagGen();
		// Encode regular arguments, then append the literal specifier un-quoted.
		const encodedArgs = args.map(encodeArg).join(' ');
		const cmd = `${tag} ${name}${encodedArgs ? ` ${encodedArgs}` : ''} {${literal.length}}\r\n`;

		return new Promise((resolve, reject) => {
			const pending: PendingCommand = { tag, resolve, reject, untagged: [] };
			this.#pending.set(tag, pending);

			// Register the continuation handler BEFORE sending the command so we
			// never miss a server + response that arrives before the write callback.
			this.#continuationHandler = (_text: string) => {
				// Step 3: send literal bytes followed by CRLF.
				this.#socket.write(Buffer.concat([literal, Buffer.from('\r\n')]), (err2) => {
					if (err2) {
						this.#pending.delete(tag);
						reject(new EmailConnectionError(`Write failed: ${err2.message}`));
					}
					// Step 4: tagged response will be handled by #drain().
				});
			};

			// Step 1: send command header with literal size specifier.
			this.#socket.write(cmd, (err) => {
				if (err) {
					this.#continuationHandler = null;
					this.#pending.delete(tag);
					reject(new EmailConnectionError(`Write failed: ${err.message}`));
				}
			});
		});
	}

	onUnsolicited(handler: (resp: UntaggedResponse) => void): void {
		this.#unsolicitedHandler = handler;
	}

	destroy(): void {
		this.#destroyed = true;
		for (const pending of this.#pending.values()) {
			pending.reject(new EmailConnectionError('Dispatcher destroyed'));
		}
		this.#pending.clear();
	}
}
