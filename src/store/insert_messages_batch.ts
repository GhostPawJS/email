import type { EmailDb } from '../database.ts';
import type { InsertMessageInput } from '../types/message.ts';
import { insertMessage } from './insert_message.ts';

export function insertMessagesBatch(db: EmailDb, inputs: InsertMessageInput[]): void {
	db.exec('BEGIN');
	try {
		for (const input of inputs) {
			insertMessage(db, input);
		}
		db.exec('COMMIT');
	} catch (e) {
		db.exec('ROLLBACK');
		throw e;
	}
}
