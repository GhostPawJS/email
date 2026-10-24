---
name: email
description: "Read, search, compose, organize and synchronize email with a local SQLite cache. Use when managing email or searching cached messages."
license: "MIT"
compatibility: "Node.js 24 or newer. MCP stdio or email CLI."
---

# email

Read and search cached email offline. Configure live accounts with email account add before network operations. Inspect messages before replying or changing folders. Confirm recipients and content before sending; trash and folder deletion can remove mail. Credentials use the existing email CLI account configuration or EMAIL_* environment variables.

## Calling tools

MCP: connect to ghostpaw-email, then call a tool by name with its JSON arguments.

CLI: `ghostpaw-email call <tool> '<JSON object>'` or `ghostpaw-email <tool> --parameter value` (without a global install: `npx -y @ghostpaw/email <tool> ...`).

Inspect schemas with `ghostpaw-email describe <tool>`. Use `--db <path>` to select a database.

## mail_read

Read mailbox state: folder list, message queue, thread view, single message body, attachment metadata, or raw EML export.

Use when: Inspect folders, cached messages, threads, attachments or raw message content.

Not for: Use mail_search to find messages by query or mail_organize to change them.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| view | string | yes | folders, queue, thread, message, attachment, eml. What to read. |
| folder | string | no | Folder path (required for queue/message/attachment/eml). |
| uid | integer | no | Message UID (required for message/attachment/eml). |
| threadId | string | no | Thread ID (required for thread view). |
| partPath | string | no | Part path for a specific attachment (optional for attachment view). |
| limit | integer | no | Maximum messages to return (queue view). |
| unreadOnly | boolean | no | Filter to unread messages only (queue view). |
| refresh | boolean | no | Fetch live folder list from server before returning (folders/queue view). |

## mail_search

Search for messages locally via FTS or remotely via IMAP SEARCH. Returns matching message references.

Use when: Find messages by a local full-text query or a remote IMAP search.

Not for: Use mail_read when the folder and message UID are already known.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| query | string | yes | Free-text search query or FTS5 expression. |
| folder | string | no | Restrict search to a specific folder. |
| mode | string | no | local, remote. local (default) or remote IMAP SEARCH. |
| since | string | no | ISO date string — only messages after this date. |
| before | string | no | ISO date string — only messages before this date. |
| hasAttachments | boolean | no | Filter to messages with attachments. |
| unreadOnly | boolean | no | Filter to unread messages. |
| limit | integer | no | Maximum number of results. |

## mail_compose

Compose and send email: send new message, reply, forward, save/update/send a draft.

Use when: Send, reply, forward, or save and manage a draft after its content is agreed.

Not for: Use mail_read to inspect an existing message without sending or saving content.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| action | string | yes | send, reply, forward, save_draft, update_draft, send_draft.  |
| folder | string | no | Source folder (required for reply/forward). |
| uid | integer | no | Source message UID (required for reply/forward/update_draft/send_draft). |
| input | object | no | ComposeInput / ReplyInput / ForwardInput payload. |

## mail_organize

Organize messages: mark read/unread/starred/answered, copy, move, archive, trash, junk, label, or manage folders.

Use when: Change message flags, labels, destinations or folder organization.

Not for: Use mail_read or mail_search when only inspection is requested.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| action | string | yes | mark_read, mark_unread, star, unstar, mark_answered, copy, move, archive, trash, junk, not_junk, set_labels, add_labels, remove_labels, create_folder, rename_folder, delete_folder, subscribe_folder, unsubscribe_folder.  |
| folder | string | no | Source folder (required for message actions). |
| uids | array | no | Message UIDs to act on. |
| destination | string | no | Destination folder (required for copy/move). |
| labels | array | no | Labels to set/add/remove. |
| path | string | no | Folder path (required for folder actions). |
| oldPath | string | no | Old folder path (required for rename_folder). |
| newPath | string | no | New folder path (required for rename_folder). |

## mail_sync

Manage the IMAP connection lifecycle and sync local state: connect, disconnect, reconnect, sync folders, or refresh the folder list.

Use when: Connect, disconnect, reconnect, refresh folders or synchronize the cache.

Not for: Use mail_read for cached content or the network watch stream for continuous monitoring.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| action | string | yes | connect, disconnect, reconnect, sync, refresh_folders, watch.  |
| folders | array | no | Folders to sync or watch (optional — defaults to all subscribed folders). |
| bodies | string | no | none, missing, all. Body fetch strategy for sync (default: missing). |

## Workflow guides

- [triage-inbox](references/triage-inbox.md): Process a full inbox from scratch: sync to get latest state, read message queue, selectively fetch bodies for decisions, then bulk-organize by priority.
- [read-and-reply](references/read-and-reply.md): Read a message with full thread context, then compose and send a properly-threaded reply with quoted attribution.
- [connect-and-sync](references/connect-and-sync.md): Establish or restore an IMAP connection, refresh the folder list, and pull new messages — handling first-run vs incremental scenarios.
- [search-and-act](references/search-and-act.md): Find messages matching criteria (local FTS first, remote IMAP SEARCH as fallback), verify targets, then act — organize, reply, or present.
- [compose-and-send](references/compose-and-send.md): Full draft lifecycle — save, review, update, then send — plus direct send, reply, and forward with proper threading and forwarded-header blocks.
- [organize-bulk](references/organize-bulk.md): Bulk organize messages across folders — flagging, moving, archiving, labelling — and manage the folder hierarchy as part of the flow.
- [attachment-workflow](references/attachment-workflow.md): Discover, inspect, and fetch email attachments on demand; embed attachments in outbound messages; and export or import full .eml files.
- [recover-from-disruption](references/recover-from-disruption.md): Detect and recover from connection loss or IMAP/SMTP failures — reconnect with back-off, re-sync to reconcile state, and handle auth vs transient errors distinctly.
- [cli](references/cli.md): Complete existing email CLI guide.

## Principles

- Inspect before changing messages.
- Confirm recipients and content before sending.
