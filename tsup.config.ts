import { defineConfig } from 'tsup';

export default defineConfig({
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
});
