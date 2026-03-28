import { normalizeSubject } from '../lib/normalize_subject.ts';
import type { Address } from '../types/address.ts';
import type { ComposeInput, ForwardInput } from '../types/compose.ts';
import type { Message, MessageBody } from '../types/message.ts';

function fmtAddr(a: Address): string {
	return a.name ? `${a.name} <${a.address}>` : a.address;
}

/**
 * Build the "---------- Forwarded message ----------" attribution block that
 * appears in inline forwards per the CONCEPT spec.
 */
function buildForwardedHeader(original: Message): string {
	const lines = ['---------- Forwarded message ----------'];
	if (original.from) lines.push(`From: ${fmtAddr(original.from)}`);
	if (original.date) {
		// Show a compact human date: "Mar 27, 2026"
		const d = new Date(original.date);
		const display = Number.isNaN(d.getTime())
			? original.date
			: d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
		lines.push(`Date: ${display}`);
	}
	if (original.subject) lines.push(`Subject: ${original.subject}`);
	if (original.to?.length) lines.push(`To: ${original.to.map(fmtAddr).join(', ')}`);
	return lines.join('\n');
}

export function composeForward(original: Message & MessageBody, input: ForwardInput): ComposeInput {
	const origSub = original.subject ?? '';
	const base = normalizeSubject(origSub);
	const subject = origSub.toLowerCase().startsWith('fwd:') ? origSub : `Fwd: ${base}`;
	const mode = input.mode ?? 'inline';

	let text: string | undefined;
	if (mode === 'inline') {
		const header = buildForwardedHeader(original);
		const body = original.textPlain ?? '';
		const prefix = input.text ?? '';
		text = prefix ? `${prefix}\n\n${header}\n\n${body}` : `${header}\n\n${body}`;
	} else {
		// Attachment mode: new text only, original is attached as message/rfc822
		text = input.text;
	}

	const result: ComposeInput = {
		from: { address: 'forwarder@local' },
		to: input.to,
		subject,
	};
	if (input.cc) result.cc = input.cc;
	if (input.bcc) result.bcc = input.bcc;
	if (text !== undefined) result.text = text;
	if (input.html !== undefined) result.html = input.html;
	if (input.attachments) result.attachments = input.attachments;
	return result;
}
