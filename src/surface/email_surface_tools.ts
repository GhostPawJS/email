import type { EmailDb } from '../database.ts';
import { createReadSurface } from '../read.ts';
import { listAccounts, upsertAccount } from '../store/index.ts';
import type { SurfaceTool } from '../surfaces/surface_types.ts';
import { emailTools } from '../tools/aligned.ts';
import type { EmailToolContext } from '../tools/tool_metadata.ts';

export const emailMcpTools: readonly SurfaceTool<EmailDb>[] = emailTools.map((tool) => ({
	...tool,
	inputSchema: { ...tool.inputSchema, type: 'object' },
	async handler(db, input) {
		const local =
			(tool.name === 'mail_search' && input.mode !== 'remote') ||
			(tool.name === 'mail_read' && !input.refresh && input.view !== 'eml');
		try {
			if (local) {
				const accountId = listAccounts(db)[0]?.id ?? 1;
				return await tool.handler(
					{ read: createReadSurface(db, accountId) } as EmailToolContext,
					input,
				);
			}
			const { resolveAccount, buildEmailConfig } = await import('../cli/account.ts');
			const config = buildEmailConfig(resolveAccount());
			const { ImapSession } = await import('../imap/session.ts');
			const { createWriteSurface } = await import('../write.ts');
			const { createNetworkSurface } = await import('../network.ts');
			const auth = config.auth;
			const username =
				'user' in auth ? auth.user : (auth.credentials.user ?? auth.credentials.username ?? 'user');
			const account = upsertAccount(db, {
				host: config.imap.host,
				port: config.imap.port,
				username,
			});
			const session = new ImapSession(config);
			try {
				const explicitConnect =
					tool.name === 'mail_sync' &&
					['connect', 'reconnect', 'disconnect'].includes(String(input.action));
				if (!explicitConnect) await session.connect();
				return await tool.handler(
					{
						read: createReadSurface(db, account.id, { session }),
						write: createWriteSurface(db, { config, accountId: account.id, session }),
						network: createNetworkSurface(db, { accountId: account.id, session }),
					},
					input,
				);
			} finally {
				await session.disconnect();
			}
		} catch (error) {
			return {
				ok: false,
				outcome: 'error',
				summary: error instanceof Error ? error.message : String(error),
				next: [
					{
						kind: 'use_tool',
						message:
							'Configure an account with ghostpaw-email account add --name work --imap-host imap.example.com --smtp-host smtp.example.com --user you@example.com --pass yourpassword.',
					},
				],
				data: { entities: [] },
			};
		}
	},
}));

export const emailSurfaceTools: readonly SurfaceTool<EmailDb>[] = /* @__PURE__ */ emailMcpTools.map(
	(tool) => ({
		...tool,
		cli: {
			noun: 'mail',
			verb: tool.name.slice(5),
			...(tool.name === 'mail_search' ? { positionals: ['query'] } : {}),
			...(tool.name === 'mail_compose' ? { fileArgs: ['input'] } : {}),
			...(tool.inputSchema.properties?.action?.enum
				? {
						action: {
							property: 'action',
							verbs: Object.fromEntries(
								tool.inputSchema.properties.action.enum.map((value) => [
									String(value),
									value === 'save_draft' ? 'draft' : String(value).replaceAll('_', '-'),
								]),
							),
						},
					}
				: {}),
		},
	}),
);
