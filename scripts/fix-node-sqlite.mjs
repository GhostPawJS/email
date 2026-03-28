// Post-build: esbuild strips 'node:' from 'node:sqlite' because node:sqlite
// is a Node 24-only built-in and esbuild writes it as 'sqlite' for compatibility.
// Node 24 only recognises the 'node:' prefix for this module, so we restore it.
import { readFileSync, writeFileSync } from 'node:fs';

const files = ['dist/index.js', 'dist/index.cjs'];

for (const file of files) {
	const before = readFileSync(file, 'utf8');
	const after = before
		.replace(/from 'sqlite'/g, "from 'node:sqlite'")
		.replace(/require\('sqlite'\)/g, "require('node:sqlite')");
	if (before !== after) {
		writeFileSync(file, after);
		console.log(`  patched: ${file}`);
	}
}
