import type { EmailDb } from '../database.ts';
import type { Thread } from '../types/thread.ts';
import { deserializeMessageRow } from './deserialize_message.ts';

export function getThread(db: EmailDb, threadId: string): Thread {
	const rows = db
		.prepare(
			`
				SELECT * FROM messages
				WHERE thread_id = ?
				ORDER BY COALESCE("date", received_at) ASC
			`,
		)
		.all(threadId) as Record<string, unknown>[];
	const messages = rows.map((row, i) => ({
		...deserializeMessageRow(row),
		depth: i,
	}));
	const participants = new Map<string, { name?: string; address: string }>();
	for (const m of messages) {
		if (m.from) participants.set(m.from.address, m.from);
		for (const t of m.to) participants.set(t.address, t);
	}
	const unread = messages.filter((m) => !m.flags.includes('\\Seen')).length;
	return {
		threadId,
		subject: messages[0]?.subject ?? null,
		participants: [...participants.values()],
		messageCount: messages.length,
		unreadCount: unread,
		lastDate:
			messages[messages.length - 1]?.date ?? messages[messages.length - 1]?.receivedAt ?? '',
		messages,
	};
}
