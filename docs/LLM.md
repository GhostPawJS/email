# LLM Surface

`@ghostpaw/email` exposes the same family-style AI runtime layers as the other GhostPaw packages:

- `tools`: structured intent-shaped operations
- `skills`: reusable workflow guidance
- `soul`: a small prompt foundation for the email domain

## Soul

```ts
import { soul } from '@ghostpaw/email';

const prompt = soul.renderEmailSoulPromptFoundation();
```

The built-in soul is intentionally compact in this foundation pass. It focuses on local state honesty, transport boundaries, and stable future seams.

## Tools

```ts
import { tools } from '@ghostpaw/email';

const registry = tools.emailTools;
const searchTool = tools.getEmailToolByName('search_email');
```

The current registry includes:

- `search_email`
- `review_email`
- `inspect_email_item`
- `manage_account`
- `manage_mailbox`
- `sync_email`
- `send_email`

These tools already return structured results, but the package still uses hello-world-level behavior internally.

## Skills

```ts
import { skills } from '@ghostpaw/email';

const workflows = skills.emailSkills;
```

Current skills are lightweight operator guidance for:

- inbox triage
- replying to a message
- syncing a mailbox

## Current Boundaries

- Tool outputs are structured and stable.
- Protocol behavior is still stubbed.
- The local schema is real and can already support deterministic tests and integration wiring.
