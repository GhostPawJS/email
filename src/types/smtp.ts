export type SmtpResponse = {
	code: number;
	enhanced: string | null;
	message: string;
	isMultiline: boolean;
};

export type SmtpErrorCategory = 'success' | 'temporary' | 'permanent';
