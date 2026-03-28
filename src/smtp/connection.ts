import * as net from 'node:net';
import * as tls from 'node:tls';
import type { SmtpResponse } from '../types/smtp.ts';
import { parseSmtpResponse } from './parse_response.ts';

export class SmtpConnection {
	readonly #host: string;
	readonly #port: number;
	readonly #useTls: boolean;
	readonly #allowInsecure: boolean;

	#socket: ReturnType<typeof net.connect> | ReturnType<typeof tls.connect> | null = null;
	#capabilities: Map<string, string> = new Map();
	#maxSize: number | null = null;
	#lineBuffer = '';

	constructor(options: {
		host: string;
		port: number;
		tls?: boolean;
		allowInsecure?: boolean;
	}) {
		this.#host = options.host;
		this.#port = options.port;
		this.#useTls = options.tls !== false && options.port !== 25;
		this.#allowInsecure = options.allowInsecure ?? false;
	}

	get capabilities(): Map<string, string> {
		return this.#capabilities;
	}

	get maxSize(): number | null {
		return this.#maxSize;
	}

	connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			const doConnect = () => {
				if (this.#useTls) {
					this.#socket = tls.connect({ host: this.#host, port: this.#port });
				} else if (this.#allowInsecure || this.#port !== 25) {
					this.#socket = net.connect({ host: this.#host, port: this.#port });
				} else {
					reject(new Error('Plaintext port 25 requires allowInsecure: true'));
					return;
				}

				this.#socket.once('error', reject);
				this.#socket.once(
					'secureConnect' in this.#socket ? 'secureConnect' : 'connect',
					async () => {
						try {
							// Read greeting
							await this.#readResponse();
							// EHLO
							const ehloResp = await this.sendCommand(`EHLO ${this.#host}`);
							this.#parseEhlo(ehloResp);
							// STARTTLS on port 587
							if (!this.#useTls && this.#capabilities.has('STARTTLS')) {
								await this.sendCommand('STARTTLS');
								await this.#upgradeToTls();
								const ehlo2 = await this.sendCommand(`EHLO ${this.#host}`);
								this.#parseEhlo(ehlo2);
							}
							resolve();
						} catch (e) {
							reject(e);
						}
					},
				);
			};
			doConnect();
		});
	}

	async disconnect(): Promise<void> {
		try {
			await this.sendCommand('QUIT');
		} catch {
			// ignore
		}
		this.#socket?.destroy();
		this.#socket = null;
	}

	sendCommand(cmd: string): Promise<SmtpResponse> {
		return new Promise((resolve, reject) => {
			if (!this.#socket) {
				reject(new Error('Not connected'));
				return;
			}
			const lines: string[] = [];
			const onData = (chunk: Buffer) => {
				this.#lineBuffer += chunk.toString('ascii');
				const parts = this.#lineBuffer.split('\r\n');
				this.#lineBuffer = parts.pop() ?? '';
				for (const line of parts) {
					if (!line) continue;
					lines.push(line);
					if (line[3] === ' ') {
						// final line
						this.#socket?.off('data', onData);
						resolve(parseSmtpResponse(lines));
						return;
					}
				}
			};
			this.#socket.on('data', onData);
			this.#socket.write(`${cmd}\r\n`, (err) => {
				if (err) {
					this.#socket?.off('data', onData);
					reject(err);
				}
			});
		});
	}

	#readResponse(): Promise<SmtpResponse> {
		return new Promise((resolve, reject) => {
			const lines: string[] = [];
			const onData = (chunk: Buffer) => {
				this.#lineBuffer += chunk.toString('ascii');
				const parts = this.#lineBuffer.split('\r\n');
				this.#lineBuffer = parts.pop() ?? '';
				for (const line of parts) {
					if (!line) continue;
					lines.push(line);
					if (line[3] === ' ') {
						this.#socket?.off('data', onData);
						resolve(parseSmtpResponse(lines));
						return;
					}
				}
			};
			this.#socket?.on('data', onData);
			this.#socket?.once('error', reject);
		});
	}

	#parseEhlo(resp: SmtpResponse): void {
		for (const line of resp.message.split(' ')) {
			const [key, ...vals] = line.split(' ');
			if (key) this.#capabilities.set(key.toUpperCase(), vals.join(' '));
		}
		const sizeStr = resp.message.match(/SIZE (\d+)/i)?.[1];
		if (sizeStr) this.#maxSize = Number(sizeStr);
	}

	#upgradeToTls(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.#socket) {
				reject(new Error('No socket'));
				return;
			}
			const upgraded = tls.connect({
				socket: this.#socket as net.Socket,
				host: this.#host,
			});
			upgraded.once('secureConnect', () => {
				this.#socket = upgraded;
				resolve();
			});
			upgraded.once('error', reject);
		});
	}
}
