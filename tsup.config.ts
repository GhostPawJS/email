import { chmodSync } from 'node:fs';
import { defineConfig } from 'tsup';

export default defineConfig([
	// ── Library ───────────────────────────────────────────────────────────────
	{
		entry: ['src/index.ts', 'src/mcp.ts'],
		format: ['esm', 'cjs'],
		dts: true,
		clean: true,
		target: 'node24',
		splitting: false,
		sourcemap: false,
		treeshake: true,
		platform: 'node',
		// node:sqlite is only available at runtime via the Node.js built-in module system.
		// Without this, esbuild strips the "node:" prefix → "sqlite" → ERR_MODULE_NOT_FOUND.
		external: ['node:sqlite'],
		removeNodeProtocol: false,
	},
	// ── CLI binary ────────────────────────────────────────────────────────────
	{
		entry: { cli: 'src/cli.ts', 'mcp-server': 'src/mcp_server_bin.ts' },
		format: ['esm'],
		dts: false,
		onSuccess: async () => {
			for (const file of ['dist/cli.js', 'dist/mcp-server.js']) chmodSync(file, 0o755);
		},
		target: 'node24',
		splitting: false,
		sourcemap: false,
		treeshake: true,
		platform: 'node',
		external: ['node:sqlite'],
		removeNodeProtocol: false,
		// Bundle citty into the binary so `npx @ghostpaw/email` works without a separate install.
		noExternal: ['citty'],
		banner: { js: '#!/usr/bin/env node' },
	},
]);
