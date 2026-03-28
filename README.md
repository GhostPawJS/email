# @ghostpaw/email

[![npm](https://img.shields.io/npm/v/@ghostpaw/email)](https://www.npmjs.com/package/@ghostpaw/email)
[![node](https://img.shields.io/node/v/@ghostpaw/email)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/@ghostpaw/email)](LICENSE)
[![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

A standalone email engine for Node.js, built on SQLite.

Email treats IMAP sync, SMTP send, local caching, threading, search, and
transport errors as one coherent model instead of a grab bag of protocol
adapters. It ships as a single prebundled blob with zero runtime dependencies,
designed for two audiences at once: human developers working directly in code,
and LLM agents operating through a structured `soul` / `tools` / `skills`
runtime.

## Install

```bash
npm install @ghostpaw/email
```

Requires **Node.js 24+** (uses the built-in `node:sqlite` module).

## Quick Start

```ts
import { Mailbox } from '@ghostpaw/email';

const mailbox = new Mailbox({
  imap: { host: 'imap.example.com', port: 993, tls: true },
  smtp: { host: 'smtp.example.com', port: 465, tls: true },
  auth: { user: 'user@example.com', pass: 'secret' },
  storage: 'mail.db',
});

await mailbox.connect();

const folders = mailbox.read.folders();
await mailbox.network.sync();
const messages = mailbox.read.messages('INBOX', { limit: 20 });

await mailbox.write.send({
  to: [{ address: 'bob@example.com' }],
  subject: 'Hello',
  text: 'Sent from @ghostpaw/email.',
});

await mailbox.disconnect();
```

`connect()` opens the SQLite database, initialises the schema, upserts the
account, and authenticates the IMAP session — one call does everything.

## The Model

Seven stored concepts and three derived ones:

| Concept | Purpose |
|---|---|
| **Account** | One email identity with IMAP/SMTP connection config |
| **Folder** | One IMAP mailbox path with sync metadata and role detection |
| **Message** | A locally cached email header record with flags, labels, and envelope |
| **Body** | The decoded text/html content and raw RFC 2822 bytes of one message |
| **Attachment** | A decoded MIME part with on-demand binary fetch |
| **SyncLog** | A record of one completed sync pass per folder |
| **Thread** | A JWZ conversation tree derived from References/In-Reply-To headers |

The model means each kind of mail state has its own home:

| What it looks like | What it actually is |
|---|---|
| An email inbox | A `Folder` with `role: 'inbox'` and synced messages |
| A conversation | A `Thread` computed from `References` and `In-Reply-To` chains |
| An unread email | A `Message` without `\Seen` in its `flags` array |
| A starred email | A `Message` with `\Flagged` in its `flags` |
| A PDF attached to a message | An `Attachment` with metadata from BODYSTRUCTURE and data fetched on demand |
| "Sync found 12 new messages" | A `SyncLog` row recording strategy, counts, and duration |

State is derived, not toggled. Thread IDs are computed from header chains at
sync time, folder roles are detected from IMAP special-use attributes, and
attachment metadata is extracted from BODYSTRUCTURE — all materialised during
sync, never stored as manual status fields.

## Two Audiences

### Human developers

Use the `Mailbox` class with typed `read`, `write`, and `network` surfaces for
direct-code access to every mail operation:

```ts
import { Mailbox } from '@ghostpaw/email';

const mailbox = new Mailbox(config);
await mailbox.connect();

const threads = mailbox.read.threads('INBOX', { limit: 20 });
const detail = await mailbox.read.getMessage('INBOX', uid);
await mailbox.write.reply('INBOX', uid, { text: 'Acknowledged.' });
await mailbox.write.archive('INBOX', [uid]);
```

See [HUMAN.md](docs/HUMAN.md) for the full human-facing guide with worked
examples.

### LLM agents

Use the `tools`, `skills`, and `soul` namespaces for a structured runtime
surface designed to minimise LLM cognitive load:

```ts
import { skills, soul, tools } from '@ghostpaw/email';

// 5 intent-shaped tools covering the full mailbox lifecycle
const allTools = tools.emailTools;
const readTool = tools.getEmailToolByName('mail_read');

// 8 reusable workflow skills for multi-step scenarios
const triageSkill = skills.getEmailSkillByName('triage-inbox');

// Thinking foundation for system prompts
const systemPrompt = soul.renderEmailSoulPromptFoundation();
```

Every tool returns a structured result with `outcome`, `summary`, `entities`,
and `nextSteps` — no thrown exceptions to parse, no ambiguous prose.

See [LLM.md](docs/LLM.md) for the full AI-facing guide covering soul, tools,
and skills.

## Tools

Five tools shaped around operator intent, not raw protocol operations:

| Tool | What it does |
|---|---|
| `mail_read` | Read folder lists, message queues, threads, bodies, attachments, or raw EML |
| `mail_search` | FTS5 local search or IMAP SEARCH on the server |
| `mail_compose` | Send, reply, forward, save/update/send drafts |
| `mail_organize` | Flags, labels, copy, move, archive, trash, junk, folder management |
| `mail_sync` | Connect, disconnect, reconnect, sync, refresh folders, watch |

## Key Properties

- **Zero runtime dependencies.** Only `node:sqlite`, `node:tls`, `node:net`,
  `node:zlib`, `node:crypto` (built into Node 24+).
- **Single prebundled blob.** One ESM + one CJS entry in `dist/`. No subpath
  exports, no code splitting.
- **Pure SQLite storage.** FTS5 full-text search, six tables, and deterministic
  derived reads. `Mailbox` creates and manages its own `DatabaseSync` instance.
- **Full IMAP engine.** Streaming tokenizer, response parser, COMPRESS=DEFLATE,
  IDLE (RFC 2177), CONDSTORE/QRESYNC (RFC 7162), XOAUTH2/OAUTHBEARER.
- **Full SMTP client.** TLS/STARTTLS/plaintext, PLAIN/LOGIN/XOAUTH2, dot
  stuffing, APPEND to Sent after send.
- **Fetch-on-demand bodies.** Initial sync pulls headers and BODYSTRUCTURE only.
  Message bodies and attachment bytes are fetched when actually read.
- **JWZ threading.** Conversation trees computed from References/In-Reply-To
  headers, with depth-ordered rendering and cross-folder support.
- **Intention-shaped writes.** `send`, `reply`, `forward`, `archive`, `trash`,
  `saveDraft`, `sendDraft` — operations that say what happened, not generic CRUD.
- **Additive AI runtime.** `soul` for posture, `tools` for actions, `skills` for
  workflow guidance — all optional, all structured.
- **Colocated tests.** Every non-type module has a colocated `.test.ts` file.
  The documented behaviour is backed by executable coverage.

## Package Surface

```ts
import {
  Mailbox,      // porcelain class — the primary entry point
  initSchema,   // schema setup (called automatically by Mailbox.connect())
  read,         // read surface factory
  write,        // write surface factory
  network,      // network surface factory
  tools,        // LLM tool definitions + registry
  skills,       // LLM workflow skills + registry
  soul,         // thinking foundation for system prompts
} from '@ghostpaw/email';
```

All domain and runtime types are also available at the root for TypeScript
consumers:

```ts
import type {
  EmailConfig,
  AuthConfig,
  EmailReadSurface,
  EmailWriteSurface,
  EmailNetworkSurface,
  EmailToolDefinition,
  EmailToolResult,
  EmailSkill,
  EmailSoul,
  ComposeInput,
  ReplyInput,
  ForwardInput,
  Message,
  MessageDetail,
  Thread,
  Folder,
  Attachment,
  AttachmentMeta,
  SyncResult,
  WatchEvent,
} from '@ghostpaw/email';
```

## Documentation

| Document | Audience |
|---|---|
| [HUMAN.md](docs/HUMAN.md) | Human developers using the `Mailbox` API with `read` / `write` / `network` |
| [LLM.md](docs/LLM.md) | Agent builders wiring `soul`, `tools`, and `skills` into LLM systems |
| [docs/README.md](docs/README.md) | Architecture overview: model, invariants, protocol boundaries, source layout |
| [docs/entities/](docs/entities/) | Per-entity manuals with schema, operations, and invariants |

## Development

```bash
npm install
npm test            # node:test runner
npm run typecheck   # tsc --noEmit
npm run lint        # biome check
npm run build       # ESM + CJS + declarations via tsup
```

The repo is pinned to **Node 24.14.0** via `.nvmrc` / `.node-version` /
`.tool-versions` / `mise.toml` / Volta. Use whichever version manager you
prefer.

### Support

If this package helps your project, consider sponsoring its maintenance:

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-EA4AAA?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sponsors/Anonyfox)

---

**[Anonyfox](https://anonyfox.com) • [MIT License](LICENSE)**
