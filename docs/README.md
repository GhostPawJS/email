# @ghostpaw/email Docs

This folder is the operator and implementer manual for `@ghostpaw/email`.

The source of truth for table shapes lives in `src/schema/`. These docs do not
repeat column-by-column DDL. They explain what each concept is for, how it fits
the IMAP/SMTP model, and which operations apply to it.

## What This Package Is

`@ghostpaw/email` is a SQLite-backed email engine that manages the full lifecycle
of a mailbox — syncing from IMAP, composing and sending via SMTP, storing
messages locally, and exposing a structured surface for human developers and AI
agents alike.

The package resolves around seven stored concepts and three derived ones:

**Stored:**

- `Account`: one email identity with connection config
- `Folder`: one IMAP mailbox path (INBOX, Sent, Drafts, etc.)
- `Message`: a locally cached email header record
- `Body`: the decoded text and raw content of one message
- `Attachment`: a decoded MIME part with its binary data
- `SyncLog`: a record of one completed sync pass per folder

**Derived:**

- `Thread`: a JWZ conversation tree computed from References/In-Reply-To
- `FolderStatus`: live counts (messages, unseen, uidNext) from the server
- `AccountStats`: aggregate storage and unread counts

## Why This Package Exists

Email inboxes are among the highest-value information surfaces an agent can
operate. They contain commitments, deadlines, decisions, relationships, and
context that does not exist anywhere else.

A reliable agent email layer needs three things that raw IMAP access does not
provide: a local cache that survives disconnection, a structured read surface
that supports threading and search, and a clean write surface that enforces
correct protocol behaviour (threading headers, literal handling, UIDVALIDITY
resets, exponential backoff).

This package provides all three as a zero-npm-dependency Node.js library using
only built-in modules: `node:sqlite`, `node:tls`, `node:net`, `node:zlib`,
`node:crypto`, `node:buffer`, `TextDecoder`, and `node:events`.

## Protocol Boundaries

IMAP and SMTP are intentionally treated as different verbs.

**IMAP** (pull) reads a shared remote mailbox and materializes a local snapshot.
It is reversible up to the point of EXPUNGE. The sync engine supports:

- Initial sync (batched UID FETCH with BODYSTRUCTURE and envelope data)
- Incremental sync (QRESYNC with HIGHESTMODSEQ for flag changes and expunges;
  UID-comparison fallback when QRESYNC is unavailable)
- UIDVALIDITY detection and automatic cache rebuild on mismatch
- COMPRESS=DEFLATE for bandwidth reduction
- IDLE (RFC 2177) for push notification
- CONDSTORE / QRESYNC (RFC 7162)
- XOAUTH2 / OAUTHBEARER / PLAIN / LOGIN authentication
- Token-refresh callback for OAuth providers

**SMTP** (push) deposits a new message into a foreign outbound queue. It is
permanent once the `250 OK` response arrives. The SMTP client supports:

- TLS (port 465), STARTTLS (port 587), and plaintext
- PLAIN / LOGIN / XOAUTH2 authentication
- Dot-stuffing and proper DATA termination
- APPEND to Sent after successful send

These two surfaces share credentials but have separate connections and separate
error recovery paths.

## Entity Manuals

Concept-level manuals under `docs/entities/`:

- `ACCOUNTS.md`: one email identity per account
- `FOLDERS.md`: IMAP mailbox paths and their role assignments
- `MESSAGES.md`: message header records and flag semantics
- `BODIES.md`: decoded text, raw RFC 2822 content, and BODYSTRUCTURE
- `ATTACHMENTS.md`: MIME parts with on-demand binary fetch
- `THREADS.md`: JWZ conversation trees derived from threading headers
- `SYNC.md`: sync log, QRESYNC engine, and fetch-on-demand strategies

## How To Read The Model

Use the surfaces in this order:

1. Call `initSchema(db)` once to create the six tables, FTS5 index, and indexes.
2. Construct a `Mailbox` instance with an `EmailConfig` and a `DatabaseSync` handle.
3. Use `mailbox.network.connect()` to open the IMAP session.
4. Use `mailbox.network.sync()` to pull messages into the local cache.
5. Use `mailbox.read.*` for all local reads.
6. Use `mailbox.write.*` for flag changes, composition, and folder management.
7. Use `mailbox.network.watch()` for ongoing IDLE-based push monitoring.

## Lifecycle Truth

### Messages

A message enters the local cache during sync. Its lifecycle:

- **Absent**: not yet fetched (uid exists on server but not in local DB)
- **Present**: header record exists locally
- **Body fetched**: `bodies` row exists for this message id
- **Attachment fetched**: one or more `attachments` rows exist for this message id

Bodies and attachments are fetched on demand, not during initial sync.

Message flags follow RFC 3501 semantics:

- `\Seen`: read by at least one client
- `\Flagged`: starred/important
- `\Answered`: a reply was sent
- `\Deleted`: marked for expunge (not yet removed)
- `\Draft`: a draft message

Labels (Gmail keywords) are stored separately from flags.

### Folders

A folder's `uidValidity` tracks whether the UID namespace is still valid. When
the server changes `uidValidity`, all message UIDs for that folder are stale and
the local cache for that folder is cleared and rebuilt.

`uidNext` and `highestModSeq` are updated after each sync pass and used to
compute the delta for the next incremental sync.

### Sync

Each `sync_log` row records one completed folder sync pass: folder id,
direction, message count delta, duration, and outcome. The sync engine writes
these rows atomically at the end of each pass.

## Core Invariants

- Every message belongs to exactly one folder
- A body belongs to exactly one message
- Attachments belong to exactly one message via message id
- Thread ids are computed from References/In-Reply-To headers at ingest time; they are not stored separately
- FTS5 index (`messages_fts`) is populated during sync and kept in sync by the sync engine
- `uidValidity` changes trigger full folder cache invalidation
- Folder roles are detected from IMAP special-use attributes and XLIST; the detection is best-effort
- `initSchema(db)` is idempotent: safe to call on an already-initialised database

## Temporal And Flag Semantics

- `date` on a message is the RFC 2822 `Date:` header value (sender-supplied)
- `receivedAt` is the local ingest timestamp
- `modSeq` is the HIGHESTMODSEQ value at the time of last sync, used by CONDSTORE
- Flags are stored as a JSON-encoded `string[]` column
- Labels are stored as a JSON-encoded `string[]` column
- `bodyStructure` is stored as a JSON-encoded `BodyPart` tree

## Operation Philosophy

The engine exposes intention-shaped operations, not raw SQL writes:

- **sync** pulls the remote state into the local cache
- **send** deposits a new message into the SMTP queue
- **reply** sets correct threading headers and sends
- **archive / trash / junk** map to server-detected special-use folders
- **saveDraft** stages a message locally before committing to the wire

That keeps protocol truth aligned with what actually happened, and avoids the
common trap of treating a staged draft as a sent message.

## Public Surface

- `initSchema(db)`: initialize the full schema (idempotent)
- `Mailbox`: the main porcelain class — accepts `EmailConfig` + `DatabaseSync`
- `read.*`: `EmailReadSurface` — local reads, FTS search, stats
- `write.*`: `EmailWriteSurface` — flag changes, compose, folders, drafts
- `network.*`: `EmailNetworkSurface` — connect, sync, watch, remote search
- `tools.emailTools`: 5 LLM-oriented tool definitions (see `LLM.md`)
- `skills.emailSkills`: 8 workflow skill definitions (see `LLM.md`)
- `soul.emailSoul`: `Postmaster` thinking foundation (see `LLM.md`)

## Code Source Of Truth

- `src/schema/`: DDL for all six tables, FTS5, and indexes
- `src/store/`: CRUD operations per entity
- `src/imap/`: IMAP tokenizer, parser, dispatcher, session, auth, compression
- `src/smtp/`: SMTP client (response parser, connection, auth, send flow)
- `src/mime/`: MIME parser (headers, addresses, decode, BODYSTRUCTURE, compose)
- `src/sync/`: sync engine (initial, incremental, body fetch, FTS population)
- `src/lib/`: utility codecs (MUTF-7, Base64, QP, ID, html-to-text)
- `src/read.ts`, `src/write.ts`, `src/network.ts`: surface implementations
- `src/mailbox.ts`: `Mailbox` porcelain class
- `src/tools/`: LLM tool facade
- `src/skills/`: LLM workflow skill library
- `src/soul.ts`: `Postmaster` soul

## Explicit Non-Goals

- no browser runtime (Node.js built-ins only: `node:sqlite`, `node:tls`, etc.)
- no multi-account fanout in v1 (one `Mailbox` instance per account)
- no push notification gateway (IDLE is pull-on-event, not server-push)
- no calendar or contact sync
- no PGP or S/MIME decryption
- no message rules engine
- no archive format other than raw `.eml`

## Supplemental Docs

- `HUMAN.md`: human-facing guide for developers using the direct-code API
- `LLM.md`: top-to-bottom overview of the soul, tools, and skills AI surface
- `PAGES.md`: interactive demo notes

## Quality Bar

Every non-type module under `src/` has a colocated `*.test.ts` sibling. The
behaviour described in these docs is backed by executable coverage.

Relative imports use explicit `.ts` specifiers so Node can run tests directly
with `--experimental-strip-types` without a separate TypeScript compilation step.
