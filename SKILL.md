# SKILL.md — `email` CLI as an Agent Tool Surface

The `email` binary is a local-first email CLI built on top of `@ghostpaw/email`. It exposes five
intent-shaped commands that map directly to the library's tool layer. Agents invoke it as a
subprocess via bash; no MCP server or standing process is needed.

---

## Prerequisites

- Node.js ≥ 24
- Install once:
  ```bash
  npm install -g @ghostpaw/email        # global install, `email` in PATH
  npx @ghostpaw/email account add ...   # or zero-install via npx
  ```

---

## Account Setup

```bash
email account add \
  --name work \
  --imap-host imap.fastmail.com --imap-port 993 \
  --smtp-host smtp.fastmail.com --smtp-port 587 \
  --user me@fastmail.com --pass "app-password"

email account list          # see all accounts
email account set-default --name work
email account show          # shows config (password redacted)
```

### Environment variables (no config file needed — useful in CI)

| Variable | Purpose |
|---|---|
| `EMAIL_ACCOUNT` | Select account by slug |
| `EMAIL_IMAP_HOST` | IMAP hostname |
| `EMAIL_IMAP_PORT` | IMAP port (default: 993) |
| `EMAIL_IMAP_TLS` | `"false"` to disable TLS |
| `EMAIL_SMTP_HOST` | SMTP hostname |
| `EMAIL_SMTP_PORT` | SMTP port (default: 587) |
| `EMAIL_SMTP_TLS` | `"false"` to disable TLS |
| `EMAIL_USER` | Auth username |
| `EMAIL_PASS` | Password auth |
| `EMAIL_ACCESS_TOKEN` | OAuth2 access token |
| `EMAIL_REFRESH_TOKEN` | OAuth2 refresh token |
| `EMAIL_CONFIG_DIR` | Override config directory (full path) |
| `EMAIL_DATA_DIR` | Override SQLite data directory (full path) |
| `NO_COLOR` | Disable ANSI color output |

---

## `--json` — Machine-Readable Output

**Always use `--json` when invoking from an agent.** Every command outputs a JSON object:

```json
{
  "outcome": "success",
  "summary": "42 message(s) in INBOX.",
  "entities": [
    { "kind": "message", "id": "1921", "title": "Re: Q2 roadmap" }
  ],
  "nextSteps": [
    "Use view: \"message\" with folder and uid to read a specific message."
  ]
}
```

`outcome` values:
- `"success"` — operation completed
- `"no_op"` — nothing to do (not an error)
- `"needs_clarification"` — more information required; check `nextSteps`
- `"error"` — operation failed; check `summary` for details and `nextSteps` for guidance

**On error, `--json` output still goes to stdout** (not stderr) so downstream parsers can always
parse stdout unconditionally.

---

## Exit Codes

| Code | When |
|---|---|
| `0` | `success` or `no_op` |
| `1` | Missing required flag, invalid value, body required |
| `2` | No config, malformed config, unknown account, no default account |
| `3` | Authentication failure |
| `4` | Network / connection failure |
| `5` | Tool returned `outcome: "error"` |
| `6` | Tool returned `outcome: "needs_clarification"` |
| `127` | Unexpected / unhandled error |

---

## Commands

### `email read [view]`

Read mailbox state. Default view: `queue` (INBOX).

```bash
email read --json                                      # queue view, INBOX
email read folders --json                              # list all folders
email read queue --folder Sent --limit 20 --json
email read queue --unread-only --json
email read thread --thread-id <id> --json
email read message --folder INBOX --uid 1921 --json
email read attachment --folder INBOX --uid 1921 --json # list attachments
email read eml --folder INBOX --uid 1921               # raw EML bytes to stdout
```

**`eml` view:** writes raw EML bytes to stdout. In `--json` mode the bytes are base64-encoded
under a `"data"` key.

```bash
email read eml --folder INBOX --uid 42 > message.eml
email read eml --folder INBOX --uid 42 --json | jq -r '.data' | base64 -d > message.eml
```

### `email search <query>`

Search messages via local FTS5 (default) or remote IMAP SEARCH.

```bash
email search "invoice" --json
email search "from:boss@work.com subject:quarterly" --json
email search "budget 2026" --folder Archive --limit 10 --json
email search "urgent" --mode remote --json
email search "report" --since 2026-01-01 --before 2026-04-01 --json
email search "contract" --has-attachments --json
```

### `email compose <action>`

Compose and send email. Body comes from `--body` or piped stdin.

```bash
# Send
email compose send --to alice@example.com --subject "Hello" --body "Hi there" --json
echo "Meeting at 3pm?" | email compose send --to alice@example.com --subject "Quick question"

# Reply (body from stdin)
echo "Sounds good!" | email compose reply --folder INBOX --uid 1921

# Reply-all
email compose reply --folder INBOX --uid 1921 --body "Thanks all" --reply-all --json

# Forward
email compose forward --folder INBOX --uid 1921 --to bob@example.com --body "FYI" --json

# Attach files (comma-separated paths)
email compose send --to a@b.com --subject "Report" --body "See attached" \
  --attach /path/to/report.pdf,/path/to/data.csv --json

# Drafts
email compose draft --save --to a@b.com --subject "Draft" --body "WIP" --json
email compose draft --send-draft 42 --json
```

### `email organize <action>`

Organize messages and folders. `--uids` accepts comma-separated UIDs.

```bash
email organize mark-read --folder INBOX --uids 1,2,3 --json
email organize star --folder INBOX --uids 42 --json
email organize archive --folder INBOX --uids 1921,1922 --json
email organize trash --folder INBOX --uids 1800 --json
email organize move --folder INBOX --uids 100 --destination Archive --json
email organize set-labels --folder INBOX --uids 42 --labels "work,priority" --json
email organize create-folder --path "Projects/2026" --json
email organize rename-folder --old-path "Projects" --new-path "Work/Projects" --json
email organize delete-folder --path "OldFolder" --json
```

### `email sync [action]`

Manage IMAP connection and sync local SQLite state. Default action: `sync`.

```bash
email sync --json                           # sync all folders (default)
email sync sync --folders INBOX,Sent --json
email sync sync --bodies all --json         # fetch all bodies
email sync refresh-folders --json
email sync connect --json
email sync disconnect --json
email sync watch --json                     # syncs then exits; continuous watching needs the library
```

---

## Multi-Step Workflow Examples

### Triage inbox

```bash
# Get unread messages
UNREAD=$(email read queue --unread-only --json)
echo "$UNREAD" | jq '.entities[].id'

# Archive a batch
email organize archive --folder INBOX --uids 1,2,3 --json
```

### Read and reply

```bash
# Read a specific message
MSG=$(email read message --folder INBOX --uid 1921 --json)
echo "$MSG" | jq '.summary'

# Reply
echo "Thanks, will do." | email compose reply --folder INBOX --uid 1921 --json
```

### Search and act

```bash
# Find all invoices from last month
RESULTS=$(email search "invoice" --since 2026-02-01 --before 2026-03-01 --json)
UIDS=$(echo "$RESULTS" | jq -r '.entities[].id' | tr '\n' ',' | sed 's/,$//')

# Move them to an Archive folder
email organize move --folder INBOX --uids "$UIDS" --destination Archive --json
```

### Full sync then read

```bash
email sync --json
email read queue --limit 20 --json
```

### Export an attachment

```bash
# List attachments
ATTS=$(email read attachment --folder INBOX --uid 1921 --json)
PART=$(echo "$ATTS" | jq -r '.entities[0].id')

# Download raw bytes
email read attachment --folder INBOX --uid 1921 --part-path "$PART" > attachment.pdf
```

---

## Error Handling for Agents

- **Always check `outcome`** before acting on `entities`. Even exit code 0 can return `"no_op"`.
- **Do not retry auth errors** (exit 3) — they require credential changes.
- **On `needs_clarification`** (exit 6) — read `nextSteps` and ask the user for more information.
- **On `error`** (exit 5) — the tool's `summary` and `nextSteps` contain actionable guidance.
- **Network errors** (exit 4) — retry after a brief pause; check host/port if it persists.

---

## Piping Patterns

```bash
# Pipe body from stdin
echo "Hello" | email compose send --to x@y.com --subject "Hi"

# Export EML and forward to another tool
email read eml --folder INBOX --uid 42 | mail -s "fwd" target@example.com

# JSON pipeline
email read queue --json | jq '.entities[] | select(.title | test("invoice"; "i")) | .id'

# Quiet mode — only exit code matters
email organize archive --folder INBOX --uids 42 --quiet && echo "archived"
```

---

## What the CLI Does NOT Do

- **No persistent daemon.** Every invocation opens a fresh IMAP connection and closes it cleanly.
- **No continuous IDLE watch.** `email sync watch` syncs once and exits. For push-style updates,
  use `Mailbox.network.watch()` from the library directly.
- **No interactive prompts.** All input comes from flags or stdin.
