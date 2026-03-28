import { DEFAULT_IDLE_TIMEOUT } from '../types/defaults.ts';
import type { UntaggedResponse } from '../types/imap_response.ts';
import type { ImapDispatcher } from './dispatcher.ts';

export type IdleEvent =
	| { type: 'exists'; count: number }
	| { type: 'expunge'; seqno: number }
	| { type: 'fetch'; seqno: number; flags: string[] };

export async function* idle(
	dispatcher: ImapDispatcher,
	options?: { signal?: AbortSignal; timeout?: number },
): AsyncGenerator<IdleEvent> {
	const timeout = options?.timeout ?? DEFAULT_IDLE_TIMEOUT;
	const signal = options?.signal;

	const events: IdleEvent[] = [];
	let notify: (() => void) | null = null;
	let done = false;

	const handler = (resp: UntaggedResponse) => {
		let ev: IdleEvent | null = null;
		if (resp.type === 'EXISTS' && resp.number !== null) {
			ev = { type: 'exists', count: resp.number };
		} else if (resp.type === 'EXPUNGE' && resp.number !== null) {
			ev = { type: 'expunge', seqno: resp.number };
		} else if (resp.type === 'FETCH' && resp.number !== null) {
			ev = { type: 'fetch', seqno: resp.number, flags: [] };
		}
		if (ev) {
			events.push(ev);
			notify?.();
		}
	};

	dispatcher.onUnsolicited(handler);

	const enterIdle = async () => {
		await dispatcher.execute('IDLE');
	};

	signal?.addEventListener('abort', () => {
		done = true;
		notify?.();
	});

	void enterIdle();

	const renewTimer = (): NodeJS.Timeout =>
		setTimeout(() => {
			notify?.();
		}, timeout);

	let timer = renewTimer();

	try {
		while (!done) {
			while (events.length > 0) {
				const ev = events.shift();
				if (ev) yield ev;
			}
			if (done) break;
			await new Promise<void>((res) => {
				notify = res;
			});
			notify = null;
			if (signal?.aborted) {
				done = true;
			} else if (events.length === 0) {
				// timeout renewal — restart IDLE
				clearTimeout(timer);
				timer = renewTimer();
			}
		}
	} finally {
		clearTimeout(timer);
		dispatcher.onUnsolicited(() => {});
	}
}
