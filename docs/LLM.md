# LLM Building Blocks

`@ghostpaw/email` is designed to work in three modes simultaneously:

- as a clean direct-code library for human developers
- as a runtime surface that agent harnesses can wire into LLM systems directly
- as a standalone `email` CLI binary that agents can invoke as a bash tool without any wiring code

LLMs need more than callable functions. They need a shaped way to think, a
small action surface, and reusable guidance for multi-step email situations.

The package therefore exposes three AI-oriented building blocks, top to bottom:

1. soul
2. tools
3. skills

The lower layers are still useful on their own, but together they form a clean
stack for reliable LLM-driven mailbox management.

## Runtime Surfaces

All three layers are exported from the package root through named namespaces:

```ts
import { skills, soul, tools } from '@ghostpaw/email';
```

The source files are:

- `src/soul.ts`: thinking foundation
- `src/tools/`: action surface
- `src/skills/`: workflow guidance

## Soul

The soul is the thinking foundation.

It does not define what the model can do. It defines how the model should
reason about a mailbox — which epistemic positions to distinguish, which
boundaries to protect, and what class of judgment to apply before modifying
state.

`@ghostpaw/email` exports the soul through the `soul` namespace:

- `soul.emailSoul`
- `soul.emailSoulEssence`
- `soul.emailSoulTraits`
- `soul.renderEmailSoulPromptFoundation()`

The runtime soul shape is:

```ts
interface EmailSoul {
  slug: string;
  name: string;
  description: string;
  essence: string;
  traits: readonly {
    principle: string;
    provenance: string;
  }[];
}
```

The current soul is `Postmaster`, with the slug `postmaster`.

Its job is to keep the model's operational instincts correct before any tool
call happens. That means:

- distinguishing local-cache reads from live server fetches from unsent drafts
- reading thread context before composing or archiving
- moving down the irreversibility gradient (read → flag → archive → send →
  delete) only as far as necessary
- classifying connection errors, auth failures, protocol rejections, and
  partial-send states as distinct situations requiring distinct responses

The exported traits are:

- Local state is a snapshot, not the truth.
- Read threads, not messages.
- Fetch only what the intent requires.
- Irreversibility has a gradient — move down it deliberately.
- Classify the failure before you respond to it.

In practice, `renderEmailSoulPromptFoundation()` is the best starting point
for a system prompt or agent role prompt. It renders the name, description,
full essence, and each trait's principle and provenance as a single string,
ready to be prepended to any agent configuration.

## Tools

The tools are the action surface.

`@ghostpaw/email` exposes a dedicated LLM-oriented tool facade under
`src/tools/`. This surface is additive: it does not replace the lower-level
`read`/`write`/`network` surfaces, but it packages the engine into a smaller,
intent-shaped contract for agent systems.

The count is deliberately small — five tools cover the full daily mailbox
lifecycle without overwhelming tool selection.

Each tool exports:

- a name and description
- a `sideEffects` classification (`read`, `write`, `external`)
- a JSON-Schema-compatible `inputSchema`
- an async `handler(ctx, input)` function

The shared runtime tool definition shape is:

```ts
interface EmailToolDefinition<TInput = unknown> {
  name: string;
  description: string;
  sideEffects: 'external' | 'none' | 'read' | 'write';
  inputSchema: JsonSchema;
  handler(ctx: EmailToolContext, input: TInput): Promise<EmailToolResult>;
}
```

The handler takes an `EmailToolContext` rather than raw database access:

```ts
interface EmailToolContext {
  read: EmailReadSurface;
  write: EmailWriteSurface;
  network: EmailNetworkSurface;
}
```

This means a consumer builds the context from a connected `Mailbox` instance
and passes it to every tool handler. The tool layer has no privileged database
access — it only calls the same surfaces a human developer would use.

The registry is surfaced through `tools`:

- `tools.emailTools`
- `tools.getEmailToolByName(name)`

Tool results use a consistent outcome contract:

- `success`
- `no_op`
- `needs_clarification`
- `error`

That keeps unusual cases explicit rather than requiring an LLM adapter to infer
intent from thrown exceptions.

The five tools and their scopes:

### `mail_read` (sideEffects: read)

Read the mailbox state. Accepts a `view` discriminator:

- `folders`: list folders (optionally refreshing from server with `refresh: true`)
- `queue`: list messages in a folder (with optional `unreadOnly` and `limit`)
- `thread`: fetch a full conversation by `threadId`
- `message`: fetch a single message with full body (triggers on-demand fetch if not cached)
- `attachment`: list attachment metadata, or fetch specific attachment bytes via `partPath`
- `eml`: export a message as raw RFC 2822 bytes

### `mail_search` (sideEffects: read)

Search for messages. Two modes:

- `local` (default): FTS5 full-text search with optional folder, date range,
  `hasAttachments`, and `unreadOnly` filters
- `remote`: IMAP SEARCH on the server (requires an active session; returns UIDs)

### `mail_compose` (sideEffects: external)

Compose and send. Accepts an `action` discriminator:

- `send`: send a new message directly via SMTP
- `reply`: compose a reply (sets threading headers, prepends attribution + quoted body)
- `forward`: forward a message (inline with header block, or as `.eml` attachment)
- `save_draft`: save a draft to the Drafts folder
- `update_draft`: replace the current draft content
- `send_draft`: send the staged draft, then expunge from Drafts

### `mail_organize` (sideEffects: write)

Organize messages and folders. Accepts an `action` discriminator across 19
operations: `mark_read`, `mark_unread`, `star`, `unstar`, `mark_answered`,
`copy`, `move`, `archive`, `trash`, `junk`, `not_junk`, `set_labels`,
`add_labels`, `remove_labels`, `create_folder`, `rename_folder`,
`delete_folder`, `subscribe_folder`, `unsubscribe_folder`.

### `mail_sync` (sideEffects: external)

Manage the connection lifecycle and sync state. Accepts an `action`
discriminator: `connect`, `disconnect`, `reconnect`, `sync`,
`refresh_folders`, `watch`.

`reconnect` applies exponential back-off internally (1s → 2s → 4s → …, capped
at 30s, up to 5 attempts). `watch` syncs the requested folders and confirms
that continuous IDLE monitoring is available via the application-layer
`Mailbox.network.watch()` call.

## Skills

The skills are the workflow layer.

`@ghostpaw/email` ships a built-in runtime skill surface under `src/skills/`.
Each skill describes a reusable operating pattern for a specific multi-step
email scenario.

Where the soul says how to think and the tools define what actions are
available, the skills describe how to combine those actions well in recurring
real-world situations.

Each skill exports:

- `name`
- `description`
- `content`

The shared runtime shape is:

```ts
interface EmailSkill {
  name: string;
  description: string;
  content: string;
}
```

The skill `content` is a markdown document that references the tool facade
directly and teaches:

- which tools to use
- how to sequence them
- how to interpret outcomes
- how to handle errors, no-ops, and recovery paths

The registry is surfaced through `skills`:

- `skills.emailSkills`
- `skills.getEmailSkillByName(name)`
- `skills.defineEmailSkill()`

The eight built-in skills and what multi-step problem each solves:

| Skill | Problem it solves |
|---|---|
| `triage-inbox` | Sync → read queue → selective body fetch → bulk organize |
| `read-and-reply` | On-demand body fetch → thread context → reply with attribution |
| `connect-and-sync` | Connect → refresh folders → initial vs incremental sync |
| `search-and-act` | Local FTS → remote fallback → read targets → act |
| `compose-and-send` | Draft → review → update → send; reply/forward threading |
| `organize-bulk` | Identify → flag → dispose; folder creation before move |
| `attachment-workflow` | List metadata → selective fetch → outbound embed |
| `recover-from-disruption` | Auth vs transient error classification → reconnect → re-sync |

## How The Layers Fit Together

A well-designed `@ghostpaw/email`-based LLM system uses the layers in this
order:

1. Start from the soul so the model is primed with the correct judgment style
   — in particular, the snapshot/live/unsent distinction and the
   irreversibility gradient.
2. Expose the tools so the model has a clean action surface that maps to user
   intent rather than raw protocol operations.
3. Load relevant skills so multi-step scenarios do not have to be improvised
   from scratch.

That gives the system:

- a thinking posture (Postmaster)
- an execution surface (5 tools)
- reusable operational playbooks (8 skills)
- all backed by real runtime exports, not prose-only conventions

## Wiring Example

```ts
import { Mailbox, skills, soul, tools } from '@ghostpaw/email';

const mailbox = new Mailbox({
  imap: { host: 'imap.example.com', port: 993, tls: true },
  smtp: { host: 'smtp.example.com', port: 465, tls: true },
  auth: { user: 'user@example.com', pass: 'secret' },
  storage: 'mail.db',
});

await mailbox.connect();

// Build the tool context from the connected mailbox surfaces.
const ctx = {
  read: mailbox.read,
  write: mailbox.write,
  network: mailbox.network,
};

// Prime the system prompt with the soul.
const systemPrompt = soul.renderEmailSoulPromptFoundation();

// Look up a tool and call it.
const readTool = tools.getEmailToolByName('mail_read');
const result = await readTool?.handler(ctx, { view: 'folders' });

// Load a skill's guidance for a multi-step scenario.
const triageSkill = skills.getEmailSkillByName('triage-inbox');
console.log(triageSkill?.content);

await mailbox.disconnect();
```

## The CLI Alternative

For agents that run in an environment with bash access — Claude Code, OpenClaw,
custom agent harnesses — the `email` binary is often the right choice over
wiring up the library directly.

The CLI wraps all five tools as subcommands with the same structured output
contract:

```bash
# Every command returns { outcome, summary, entities, nextSteps } with --json
email sync --json
email read queue --json
email search "invoice" --json
email compose send --to bob@example.com --subject "Hi" --body "text" --json
email organize archive --folder INBOX --uids 42,43 --json
```

Accounts are stored in `~/.config/email/accounts.json` and can also be
provided entirely through environment variables for ephemeral CI contexts:

```bash
EMAIL_IMAP_HOST=imap.example.com EMAIL_SMTP_HOST=smtp.example.com \
EMAIL_USER=you@example.com EMAIL_PASS=secret \
  email read queue --json
```

The CLI does not replace the runtime library surface — it is the same tool
layer, exposed through bash instead of TypeScript. The soul and skills are not
directly exposed via CLI (they are for LLM system prompts, not command output),
but the five tools map one-to-one to the five subcommands.

See [SKILL.md](../SKILL.md) for the complete CLI reference, including exit
codes, piping patterns, multi-step workflow examples, and account setup.

## Human And AI Use Together

None of this replaces the human-facing library surface.

`@ghostpaw/email` still works as a direct-code library through its normal
TypeScript API via `Mailbox`, `read`, `write`, and `network`. The soul, tools,
and skills are an additional AI-oriented layer on top of that clean core.

That is the point of the design:

- humans get a clean library with typed surfaces
- agents that build systems get runtime-ready guidance and execution primitives
- agents with bash access get the same tool surface as a zero-wiring CLI
- all three operate on the same truthful underlying SQLite model
