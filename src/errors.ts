export type EmailErrorCode =
	| 'invariant'
	| 'not_found'
	| 'state'
	| 'validation'
	| 'auth'
	| 'connection'
	| 'protocol'
	| 'timeout'
	| 'unsupported'
	| 'envelope_rejected'
	| 'quota';

export class EmailError extends Error {
	readonly code: EmailErrorCode;

	constructor(code: EmailErrorCode, message: string) {
		super(message);
		this.name = 'EmailError';
		this.code = code;
	}
}

export class EmailInvariantError extends EmailError {
	constructor(message: string) {
		super('invariant', message);
		this.name = 'EmailInvariantError';
	}
}

export class EmailNotFoundError extends EmailError {
	constructor(message: string) {
		super('not_found', message);
		this.name = 'EmailNotFoundError';
	}
}

export class EmailStateError extends EmailError {
	constructor(message: string) {
		super('state', message);
		this.name = 'EmailStateError';
	}
}

export class EmailValidationError extends EmailError {
	constructor(message: string) {
		super('validation', message);
		this.name = 'EmailValidationError';
	}
}

export class EmailAuthError extends EmailError {
	readonly mechanism: string | undefined;

	constructor(message: string, mechanism?: string) {
		super('auth', message);
		this.name = 'EmailAuthError';
		this.mechanism = mechanism;
	}
}

export class EmailConnectionError extends EmailError {
	constructor(message: string) {
		super('connection', message);
		this.name = 'EmailConnectionError';
	}
}

export class EmailProtocolError extends EmailError {
	readonly rawResponse: string | undefined;
	readonly tag: string | undefined;
	readonly smtpCode: number | undefined;

	constructor(
		message: string,
		options?: { rawResponse?: string; tag?: string; smtpCode?: number },
	) {
		super('protocol', message);
		this.name = 'EmailProtocolError';
		this.rawResponse = options?.rawResponse;
		this.tag = options?.tag;
		this.smtpCode = options?.smtpCode;
	}
}

export class EmailTimeoutError extends EmailError {
	constructor(message: string) {
		super('timeout', message);
		this.name = 'EmailTimeoutError';
	}
}

export class EmailUnsupportedError extends EmailError {
	readonly feature: string;

	constructor(feature: string, message?: string) {
		super('unsupported', message ?? `Unsupported feature: ${feature}`);
		this.name = 'EmailUnsupportedError';
		this.feature = feature;
	}
}

export class EmailEnvelopeRejectedError extends EmailError {
	readonly smtpCode: number;

	constructor(message: string, smtpCode: number) {
		super('envelope_rejected', message);
		this.name = 'EmailEnvelopeRejectedError';
		this.smtpCode = smtpCode;
	}
}

export class EmailQuotaError extends EmailError {
	readonly used: number | undefined;
	readonly limit: number | undefined;

	constructor(message: string, used?: number, limit?: number) {
		super('quota', message);
		this.name = 'EmailQuotaError';
		this.used = used;
		this.limit = limit;
	}
}

export function isEmailError(value: unknown): value is EmailError {
	return value instanceof EmailError;
}

function isSmtpRetriableProtocolError(error: EmailProtocolError): boolean {
	const code = error.smtpCode;
	if (code === undefined) return false;
	if (code >= 400 && code < 500) return true;
	if (code === 421) return true;
	return false;
}

export function isRetriable(error: unknown): boolean {
	if (!isEmailError(error)) return false;
	if (error.code === 'connection' || error.code === 'timeout') return true;
	if (
		error.code === 'protocol' &&
		error instanceof EmailProtocolError &&
		isSmtpRetriableProtocolError(error)
	) {
		return true;
	}
	return false;
}
