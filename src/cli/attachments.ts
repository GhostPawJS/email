import { readFileSync, statSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { CliError } from './errors.ts';

export interface LoadedAttachment {
	filename: string;
	content: Buffer;
	mimeType?: string;
}

/**
 * Load `--attach` paths (comma-separated). Each path must name a regular file;
 * symlinks are followed. Directories, devices, FIFOs and sockets are rejected.
 */
export function loadAttachments(paths: string): LoadedAttachment[] {
	const list = paths
		.split(',')
		.map((p) => p.trim())
		.filter((p) => p.length > 0);
	if (list.length === 0) {
		throw new CliError('invalid_flag_value', '--attach needs at least one file path.');
	}
	return list.map((filePath) => {
		let stat: ReturnType<typeof statSync>;
		try {
			stat = statSync(filePath);
		} catch {
			throw new CliError('invalid_flag_value', `--attach: file not found: "${filePath}"`);
		}
		if (stat.isDirectory()) {
			throw new CliError(
				'invalid_flag_value',
				`--attach: "${filePath}" is a directory; attach individual files instead.`,
			);
		}
		if (!stat.isFile()) {
			throw new CliError(
				'invalid_flag_value',
				`--attach: "${filePath}" is not a regular file (device, FIFO or socket).`,
			);
		}
		const content = readFileSync(filePath);
		const filename = basename(filePath);
		const mimeType = MIME_MAP[extname(filename).toLowerCase()];
		return mimeType ? { filename, content, mimeType } : { filename, content };
	});
}

const MIME_MAP: Record<string, string> = {
	'.pdf': 'application/pdf',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.txt': 'text/plain',
	'.html': 'text/html',
	'.htm': 'text/html',
	'.csv': 'text/csv',
	'.json': 'application/json',
	'.zip': 'application/zip',
	'.xml': 'application/xml',
	'.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'.mp4': 'video/mp4',
	'.mp3': 'audio/mpeg',
};
