import type { Address } from './address.ts';

export type AuthConfig =
	| { user: string; pass: string }
	| {
			user: string;
			accessToken: string;
			refreshToken?: string;
			refreshFn?: () => Promise<string>;
	  }
	| { mechanism: string; credentials: Record<string, string> };

export type EmailConfig = {
	imap: {
		host: string;
		port: number;
		tls?: boolean;
	};
	smtp: {
		host: string;
		port: number;
		tls?: boolean;
	};
	auth: AuthConfig;
	identities?: Address[];
	storage?: string;
};
