import { defineConfig } from 'tsup';

export default defineConfig([
	// ── Library ───────────────────────────────────────────────────────────────
	{
		entry: ['src/index.ts'],
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
	},
	// ── CLI binary ────────────────────────────────────────────────────────────
	{
		entry: { cli: 'src/cli/index.ts' },
		format: ['esm'],
		dts: false,
		target: 'node24',
		splitting: false,
		sourcemap: false,
		treeshake: true,
		platform: 'node',
		external: ['node:sqlite'],
		// Bundle citty into the binary so `npx @ghostpaw/email` works without a separate install.
		noExternal: ['citty'],
		// -S lets env split the arguments; supported by GNU coreutils 8.30+ and macOS.
		banner: { js: '#!/usr/bin/env -S node --no-warnings' },
	},
]);
