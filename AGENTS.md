# @ghostpaw/email

A zero runtime dependency IMAP/SMTP library with a local SQLite cache and CLI.

## Use

Install with `npm install @ghostpaw/email` in a consuming project (Node 24 or newer).

```ts
import { runtime, read } from '@ghostpaw/email';

const { db } = runtime.init({
  imap: { host: 'imap.example.com', port: 993 },
  smtp: { host: 'smtp.example.com', port: 587 },
  auth: { user: 'reader@example.com', pass: 'secret' },
  storage: 'email.sqlite',
});
try {
  console.log(read.createReadSurface(db, 1).folders());
} finally {
  db.close();
}
```

Use `Mailbox.connect()` for live protocol operations and disconnect after use.
Tool implementations live in `src/tools/`. The shared facade is
`tools.aligned.emailTools`, with `listEmailToolDefinitions()` and
`getEmailToolByName()` on that namespace. Handlers take a context containing
`read`, `write`, and `network` surfaces plus input, and return a promise of
`{ ok, outcome, summary, next, data }`. Outcomes include success, no_op,
needs_clarification and error. The deprecated `tools.emailTools` and
`tools.getEmailToolByName()` retain `{ outcome, summary, entities, nextSteps }`.

## Layout

- `src/index.ts`: package exports; `mailbox.ts`: connection lifecycle.
- `src/runtime.ts`, `src/schema/`, `src/store/`: database initialization and cache.
- `src/imap/`, `src/smtp/`, `src/mime/`: protocols and message formats.
- `src/read.ts`, `src/write.ts`, `src/network.ts`: application surfaces.
- `src/sync/`, `src/tools/`, `src/skills/`: synchronization and workflow facades.
- `src/cli/`: CLI; `docs/`: detailed usage; `scripts/`: build checks.

- `src/surfaces/`: shared MCP, CLI, skill and manifest implementations.
- `src/surface/`: email bindings; `src/mcp.ts`, `src/cli.ts` and `src/mcp_server_bin.ts`: entries.
- `scripts/surfaces/`: generates SKILL.md, skills/email workflow references and directory manifests. Run `npm run surfaces`; do not edit generated outputs manually. The preserved `skills/email/references/cli.md` is a static reference.
- `scripts/guard/`, `scripts/bench/`: compatibility guards and offline benchmarks.

## Contribute

Use Node 24. Dependencies are already installed in the maintenance workspace.
Do not add runtime dependencies. Keep dependencies and devDependencies unchanged
for maintenance sweeps. Preserve exported signatures, synchronous functions,
existing tool input fields, CLI flags and database schemas; add APIs alongside
existing ones when their result shapes differ.

Run the full gate:

```sh
npm run check
```

Tests use `node:test` and `node:assert/strict` in adjacent `*.test.ts` files.
Assert observable behaviour; use local protocol peers or stream fakes rather
than external services. Preserve existing assertions and coverage inclusion.
Format changed files with `npx biome check --write <files>` when needed.
Build emits ESM and CJS libraries and an ESM CLI; the post-build script also
sets the CLI executable bit. Verify both library formats after runtime changes.

Record changes under Unreleased in CHANGELOG.md using Added, Changed or Fixed.
Releases use `npm run release:patch` or `npm run release:minor`; these commands
update the version, tag and push, and CI publishes with provenance. Maintainers
run release commands after review; maintenance work stays uncommitted.

The single gate includes generated-surface drift, size and startup budgets,
API snapshots, a packed consumer check and ratchet tests. The consumer check
installs a local tarball offline in a temporary directory.
Budget increases require `[budget-increase-approved]`, API snapshot changes
require `[api-change-approved]`, and guard, workflow or lint configuration
changes require `[guardrails-change-approved]` in the reviewed commit message.
