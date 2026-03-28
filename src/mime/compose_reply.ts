import { normalizeSubject } from '../lib/normalize_subject.ts';
import type { Address } from '../types/address.ts';
import type { ComposeInput, ReplyInput } from '../types/compose.ts';
import type { Message, MessageBody } from '../types/message.ts';

function fmtAddr(a: Address): string {
	return a.name ? `${a.name} <${a.address}>` : a.address;
}

/**
 * Build the attribution line and quoted body that precedes the reply text,
 * per the CONCEPT spec:
 *   "On Mar 27, 2026, at 10:30, Alice <alice@example.com> wrote:"
 *   "> Original message text here."
 */
function buildQuotedBody(original: Message & MessageBody): string {
	const dateStr = original.date
		? new Date(original.date).toLocaleString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			})
		: '';
	const fromStr = original.from ? fmtAddr(original.from) : '';
	const attribution = `On ${dateStr}, ${fromStr} wrote:`;

	const body = (original.textPlain ?? '').trim();
	const quoted = body
		? body
				.split('\n')
				.map((line) => `> ${line}`)
				.join('\n')
		: '';

	return `${attribution}\n${quoted}`;
}

export function composeReply(
	original: Message & MessageBody,
	input: ReplyInput,
	identities: Address[],
): ComposeInput {
	const self = new Set(identities.map((a) => a.address.toLowerCase()));
	const origSub = original.subject ?? '';
	const base = normalizeSubject(origSub);
	const subject = origSub.toLowerCase().startsWith('re:') ? origSub : `Re: ${base}`;
	const refs = [...(original.references ?? [])];
	if (original.messageId) refs.push(original.messageId);
	const to =
		input.to ??
		(original.replyTo?.address ? [original.replyTo] : original.from ? [original.from] : []);
	let cc: Address[] = input.cc ?? [];
	if (input.replyAll) {
		const add = [...original.to, ...original.cc].filter((a) => !self.has(a.address.toLowerCase()));
		cc = [...cc, ...add];
	}

	// Build reply text: user's content above, quoted original below.
	let text: string | undefined;
	if (input.text !== undefined) {
		const quoted = buildQuotedBody(original);
		text = `${input.text}\n\n${quoted}`;
	}

	const result: ComposeInput = {
		from: identities[0] ?? { address: 'unknown@local' },
		to,
		subject,
		references: refs,
	};
	if (cc.length > 0) result.cc = cc;
	if (input.bcc) result.bcc = input.bcc;
	if (text !== undefined) result.text = text;
	if (input.html !== undefined) result.html = input.html;
	if (input.attachments) result.attachments = input.attachments;
	if (original.messageId) result.inReplyTo = original.messageId;
	return result;
}
