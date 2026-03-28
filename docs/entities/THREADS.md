# Threads

A thread is a conversation tree derived from the `references` and `in_reply_to`
headers of a set of messages.

Threads are not stored as rows in their own table. They are computed at read
time by grouping messages that share the same `thread_id` value, and they are
rendered as a depth-ordered tree.

## How Thread IDs Are Assigned

Thread IDs are computed by the sync engine using the JWZ (Jamie Zawinski)
threading algorithm:

1. For each message, collect `message_id`, `in_reply_to`, and `references` values.
2. Build a parent-child map: a message is a child of its `in_reply_to` target,
   or of the last entry in its `references` list.
3. Find the root of each connected component (the message with no parent in the
   set, or a synthetic root if the root is missing from the local cache).
4. Assign the root's `message_id` as the `thread_id` for all messages in the
   component.

`thread_id` is stored on the `messages` row as a TEXT column. When a new message
arrives whose `references` points to an existing `thread_id`, it is assigned that
same value. This keeps thread membership stable as conversations grow.

## Thread Read Shape

The read surface returns threads as structured objects:

```ts
interface Thread {
  threadId: string;
  subject: string;
  participants: Address[];
  messageCount: number;
  unreadCount: number;
  hasAttachments: boolean;
  lastMessageAt: string;
  messages: ThreadMessage[];
}

interface ThreadMessage {
  id: number;
  uid: number;
  folderId: number;
  messageId: string;
  subject: string;
  from: Address;
  date: string;
  flags: string[];
  depth: number; // Nesting depth in the JWZ tree (0 = root).
  bodyFetched: boolean;
}
```

`depth` encodes the nesting level for rendering an indented conversation view.
Root messages have `depth: 0`; direct replies have `depth: 1`; replies to
replies have `depth: 2`; and so on.

## Local Store Operations

Store functions are accessible through the `store` namespace:

```ts
import { store } from '@ghostpaw/email';

// Re-compute thread IDs for all messages in a folder (run after sync).
store.computeThreads(db, folderId);

// List threads in a folder sorted by last message date.
const threads = store.listThreads(db, folderId, { limit: 20, sort: 'lastMessageAt' });

// Get one thread by threadId.
const thread = store.getThread(db, threadId);
```

These are also available through the read surface:

```ts
const threads = mailbox.read.threads('INBOX', { limit: 20 });
const thread = mailbox.read.getThread(threadId);
```

## Thread Coherence

The soul's second principle — "read threads, not messages" — applies directly
here. A message in isolation may look like an open question when the reply
arrived two messages later. Always load the full thread before composing a
reply or archiving.

```ts
// Read the thread first.
const thread = mailbox.read.getThread(threadId);

// Then compose the reply on the most recent message.
const latest = thread.messages.at(-1);
await mailbox.write.reply('INBOX', latest.uid, { text: 'Response here.' });
```

## Invariants

- `thread_id` is assigned by the sync engine, not by the user
- Missing root messages (referenced but not in the local cache) do not prevent thread formation — child messages are grouped under a synthetic root
- `thread_id` values are stable: adding a new message to an existing thread does not change the IDs of existing messages
- Thread computation is deterministic given the same set of `message_id`, `in_reply_to`, and `references` values
- Cross-folder threading (same conversation appearing in INBOX and Sent) is supported: `thread_id` spans folders
