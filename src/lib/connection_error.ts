import { EmailConnectionError } from '../errors.ts';

export function connectionError(error: Error, host: string, port: number): Error {
	return (error as NodeJS.ErrnoException).code === 'ECONNREFUSED'
		? new EmailConnectionError(`Connection refused to ${host}:${port}`)
		: error;
}
