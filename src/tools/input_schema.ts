import type { JsonSchema } from '../surfaces/surface_types.ts';

const address: JsonSchema = {
	type: 'object',
	required: ['address'],
	properties: {
		address: { type: 'string', description: 'Email address.' },
		name: { type: 'string', description: 'Display name.' },
	},
};
const recipients: JsonSchema = {
	type: 'array',
	items: address,
	description: 'Recipient addresses.',
};
const payload: JsonSchema = {
	type: 'object',
	properties: {
		from: address,
		sender: address,
		envelopeFrom: address,
		replyTo: address,
		to: recipients,
		cc: recipients,
		bcc: recipients,
		subject: { type: 'string', description: 'Message subject.' },
		text: { type: 'string', description: 'Plain text body.' },
		html: { type: 'string', description: 'HTML body.' },
		replyAll: { type: 'boolean', description: 'Reply to all original recipients.' },
		mode: { type: 'string', enum: ['inline', 'attachment'] },
		attachments: {
			type: 'array',
			description: 'Message attachments.',
			items: {
				type: 'object',
				required: ['filename', 'content'],
				properties: {
					filename: { type: 'string' },
					content: { description: 'Attachment bytes (Buffer in library calls).' },
					mimeType: { type: 'string' },
					inline: { type: 'boolean' },
					contentId: { type: 'string' },
				},
			},
		},
		inReplyTo: { type: 'string' },
		references: { type: 'array', items: { type: 'string' } },
		headers: { type: 'object' },
	},
};

/** Express action requirements without changing existing input fields. */
export function emailInputSchema(name: string, schema: JsonSchema): JsonSchema {
	const discriminator = name === 'mail_read' ? 'view' : 'action';
	const actions = schema.properties?.[discriminator]?.enum;
	if (!actions || name === 'mail_sync') return schema;
	return {
		...schema,
		oneOf: actions.map((value) => {
			const action = String(value);
			let required: string[] = [];
			let input: JsonSchema | undefined;
			if (name === 'mail_read') {
				if (action === 'thread') required = ['threadId'];
				if (['message', 'attachment', 'eml'].includes(action)) required = ['folder', 'uid'];
			} else if (name === 'mail_compose') {
				if (action !== 'send_draft') {
					required.push('input');
					input = {
						...payload,
						required: ['send', 'save_draft', 'update_draft'].includes(action)
							? ['to', 'subject']
							: action === 'forward'
								? ['to']
								: [],
					};
				}
				if (['reply', 'forward'].includes(action)) required.push('folder', 'uid');
				if (['update_draft', 'send_draft'].includes(action)) required.push('uid');
			} else if (name === 'mail_organize') {
				required =
					action === 'rename_folder'
						? ['oldPath', 'newPath']
						: action.endsWith('_folder')
							? ['path']
							: ['folder', 'uids'];
				if (['copy', 'move'].includes(action)) required.push('destination');
				if (action.endsWith('_labels')) required.push('labels');
			}
			return {
				type: 'object',
				required: [...(schema.required ?? []), ...required],
				properties: {
					...schema.properties,
					[discriminator]: { ...schema.properties?.[discriminator], enum: [value] },
					...(input ? { input } : {}),
				},
			};
		}),
	};
}
