# Concept: GhostPaw Email

## Voices
- The arrangement people trust: the agent reads and drafts, and a human sends. V059 V008 V053
- Handing an agent the inbox is a trust boundary; waking up to what it did overnight is the fear. V056 V057 V054 V027
- Email MCP servers are everywhere, and people still cannot find one they like. V021 V022 V023 V033
- An email MCP package that shipped a quiet BCC in a patch release taught people to fear the dependency itself. V050 V051 V064
- Credentials end up in .env files or on someone else's server. V012 V042 V041
- The Gmail API takes a cloud project and a pile of scopes; people want plain IMAP or JMAP. V062 V015 V004 V063
- Mail should stay local and private; people like assistants that process locally. V037 V005 V052
- Agents triage the inbox into needs-reply, leads and can-wait. V030 V032 V028
- Self-hosted local email infrastructure for agents is being built by hand. V017 V014 V011

## Buyer
A Node.js developer wiring an agent to a real mailbox over IMAP and SMTP, who has looked at hosted agent inboxes and at email MCP servers (V021 V011) and does not want to hand credentials or mail to another company (V042 V012). They arrive from a thread about agents reading mail or about the postmark-mcp incident (V056 V050), compare against AgentMail, Nylas, email-mcp, ImapFlow and Nodemailer (P003 P006 P001 P008 P009), and need to see that reading and sending are separate, the cache is a local SQLite file, and the package has no dependencies to poison (V059 V051). The hesitation most likely to stop them: an agent with send access.

## Decision path
1. Can I let the agent read without letting it send? → hero: five tools, sending is its own.
2. What does it keep? → the run: messages cached in SQLite, a reply threaded by its headers, subject search.
3. What happens without a server? → the run: sync refuses without a live IMAP session, with a typed error.
4. What about supply chain? → 0 runtime dependencies, one bundled file, Node built-ins only.
5. How do I start? → install line, MCP line, quick start, GitHub, README.

## Mechanism
Chosen: a replayed real run against email 0.4.0 on 2026-10-24 with no network. Messages are built with the library's own MIME composer, parsed with its parser and cached through the store functions its sync uses; threads are computed; the read surface searches subjects; the mail_read tool reads a thread; mail_sync without a session returns an error. A state panel shows cached messages, threads, the last search and the session. Speed: on screen at load; proof: real headers and tool results; effort: six presses; honesty: labelled as a replay with no IMAP server contacted; share value: the reply headers.
Rejected: a live inbox demo: needs credentials and a server, and would put mail in a browser.
Rejected: a comparison table against hosted inboxes: claims about others.
Rejected: a triage animation sorting mail into buckets: the library does not classify mail.

## Offer
Product: @ghostpaw/email, an open-source IMAP and SMTP engine for Node.js with a SQLite cache
Price: free, MIT licence
Delivery: `npm install @ghostpaw/email` into a Node.js 24+ project, `npx -y @ghostpaw/email mcp` as a local MCP server, or the `email` CLI

## Facts
- email 0.4.0 is on npm with zero runtime dependencies and requires Node.js 24+ for node:sqlite. https://www.npmjs.com/package/@ghostpaw/email
- The README calls it a standalone email engine for Node.js, built on SQLite, covering IMAP sync, SMTP send, caching, threading, search and transport errors. https://github.com/GhostPawJS/email
- Five tools: mail_read, mail_search, mail_compose, mail_organize, mail_sync. https://github.com/GhostPawJS/email
- The MCP server keeps cached messages in ~/.ghostpaw/email.db and reads EMAIL_IMAP_HOST, EMAIL_SMTP_HOST, EMAIL_USER and EMAIL_PASS or EMAIL_ACCESS_TOKEN; cached reads need no credentials. https://github.com/GhostPawJS/email
- Only Node built-ins are used: node:sqlite, node:tls, node:net, node:zlib, node:crypto. https://github.com/GhostPawJS/email
- The IMAP engine supports IDLE, CONDSTORE/QRESYNC, COMPRESS=DEFLATE and XOAUTH2/OAUTHBEARER; initial sync pulls headers and BODYSTRUCTURE and fetches bodies on demand. https://github.com/GhostPawJS/email
- Threads are JWZ trees computed from References and In-Reply-To headers. https://github.com/GhostPawJS/email
- In the recorded run, composeReply produced "Re: Invoice 4471 for October" with In-Reply-To and References set to the original Message-ID, and computeThreads grouped the two into one thread of depth 0 and 1. https://github.com/GhostPawJS/email#quick-start
- In the recorded run, mail_sync without an IMAP session returned "mail_sync failed: Use Mailbox.connect() — network surface requires an active IMAP session", an EmailUnsupportedError that is not retriable. https://github.com/GhostPawJS/email
- 553 tests with 94.00% line, 85.29% branch and 93.90% function coverage, measured 2026-10-24. https://github.com/GhostPawJS/email
- dist is 47.5 KB gzip and imports in about 12.3 ms on the maintainer box, measured 2026-10-24. https://github.com/GhostPawJS/email
- People let agents draft mail and keep sending for themselves. V059 V008

## Axes
| Axis | Market | Voices | Chosen |
| --- | --- | --- | --- |
| Opening | "Email Inboxes for AI agents", "Email access for AI agents" P003 P004 | reads my inbox, can never send V059 V053 | open on reading without sending |
| Proof | logos and "Trusted by 1000+ companies" P003 P006 | fears the dependency and the overnight action V050 V056 | a replayed run with real headers and the sync refusal |
| Mechanism | hosted inbox API or MCP wrapper over a provider P003 P006 P002 | wants plain IMAP, not a cloud project V062 V015 | IMAP and SMTP in-process, SQLite cache, five split tools |
| Palette | white GitHub repo pages and white product sites P001 P002 P006 | terminal users and self-hosters V060 V061 | near-black void, spectral cyan for cached mail, wraith violet for threads, alarm rose for refusals, ward green for success |
| Imagery | product screenshots and envelopes in brand colours P003 P010 | local vaults and privacy V037 V052 | generated line art: wireframe envelopes streaming into a hex vault with a paw on the lid |
| Tone | time-saving and scale claims P010 P006 | wary of agents acting overnight V056 V057 | plain, says what is kept where and what needs a server |

## Sparks
- "It reads my inbox and writes drafts. It can never send them." V059 V053
- The BCC that arrived in a patch release. V050 V051
- Waking up to what the agent did overnight. V056 V057
- A Google Cloud project just to read mail. V062 V063

## Directions
1. Agent inbox: hero promises every agent its own address. V013 → struck: first direction; it is the market (P003 P004), and the library has no hosted addresses.
  pushed: a glowing inbox counter.
2. Triage board: mail sorted into needs reply, leads, can wait. V030 → struck: the library does not classify mail.
  pushed: none.
3. Split tools: reading, searching, composing, organising and syncing are separate tools; a run shows a local cache, a threaded reply, search and a sync refusal. V059 V053 V057 → chosen
  pushed: the state panel shows the IMAP session as none the whole time; the refusal glows alarm rose.
4. Supply-chain page: open on the postmark-mcp story. V050 V051 → struck: builds on someone else's incident.
  pushed: one line on zero dependencies in the worry section.
5. Protocol checklist: IDLE, CONDSTORE, QRESYNC badges. V044 → struck: badges for specialists only.
  pushed: listed plainly in the explainer.
6. Webmail screenshot: a local web client. V060 V061 → struck: the package has no web client.
  pushed: none.
7. Privacy manifesto. V041 V043 → struck: tone; the voices want a mechanism.
  pushed: the cache path and credential variables stated plainly.
8. Plain README page. V016 → struck: market baseline (P001 P002).
  pushed: README one click away.

## Concept
Read without send. The page leads with the separation the voices trust (V059 V053): five tools, and sending is one of them, so a harness can give an agent reading and searching only. The run caches an invoice mail, a reply and a note from a friend in SQLite using the library's own composer and parser, computes two threads from the headers, finds the invoice thread by subject, reads it through mail_read, and shows mail_sync refusing without a live IMAP session (V056 V057). The cache is a local file and the package has no dependencies (V051).

## Spine
1. Hero: "Your agent can read the inbox. Sending is a separate tool." Subline: IMAP and SMTP in-process, SQLite cache, threads and FTS5 search; install and MCP lines; readout; envelope-vault art. V059 V053
2. The run: three messages, six replayed steps. V056 V057
3. Explainer: the five tools and what each may do. V021 V023
4. Worry: dependencies, credentials, what needs a server. V050 V042
5. Numbers: 0 deps, Node 24+, 553 tests, 94.0% lines, 47.5 KB gzip, about 12.3 ms import, 5 tools.
6. Start: install, quick start, GitHub, README, home and siblings.
7. Footer: Impressum, Datenschutz.

## Palette
| Role | Color | Source |
| --- | --- | --- |
| void | #04070b | the shared GhostPaw night; most email tools use white pages P001 P006 |
| panel | #0a1119 | the mailbox pane and step panes |
| rule | #1d2c3c | borders and HUD grid |
| ghost | #e3edf5 | body text |
| haze | #93a5b9 | secondary text |
| spectral | #62e6f2 | cached mail, actions, measured values |
| wraith | #b39dff | threads and replies |
| alarm | #ff7aa6 | refusals |
| ward | #7af0b4 | tool success |

## Type
| Role | Family | Source |
| --- | --- | --- |
| display | Tektur, Bahnschrift, Arial Narrow, sans-serif | the shared GhostPaw HUD face |
| body | system-ui, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif | the reader's own sans |
| code | Martian Mono, Cascadia Mono, Consolas, monospace | headers, calls and tool results |

## Form
Shared panes with chamfer and lit top bar; the mailbox pane lists messages, threads, last search, last tool result and IMAP session. Steps with call and result. One column on phones; desktop keeps the pane beside the steps. Shared 48px grid.

## Imagery
| Image | Job | Art direction | Source |
| --- | --- | --- | --- |
| hero vault | protagonist | wireframe envelopes in cyan light streaming into a hexagonal vault with a ghost paw on its lid, one envelope violet; no text V037 V052 | generated |
| thread | explanation | a diagonal chain of envelopes branching like a conversation, one reply violet; a thread from headers V030 | generated |
| share card | share preview | the hero art with the headline at 1200×630 | generated art, rendered from HTML |

## Motion
Moment: one cyan scan line sweeps the hero art once on load (900 ms).
Feedback: run steps reveal results; the refused step flashes once.
Reduced motion: no sweep or flash.

## Copy
- Use: "read", "draft", "send", "inbox" in the voices' plain sense V059 V053
- Show tool names and file paths as code. V021
- Avoid: "email for your AI", "Email access for AI agents", "agent native" P003 P004 V022
- Avoid: "full-text body search"; say FTS5 local search, as the README does. P001
- Plain second person; say the run used no server. V057
- Never present voices as customers. V048

## Changelog
- 2026-10-24: first concept from the 2026-10-24 research batch (64 voices, 12 peers); split tools chosen; replay of a real email 0.4.0 run without network. Body search left off the page: in 0.4.0 the FTS update trigger clears body text when a message row changes.
