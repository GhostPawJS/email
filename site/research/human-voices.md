# Human voices: GhostPaw Email

## Batch 2026-10-24 · from zero · queries: "email MCP server", "AI agent read my email", "IMAP agent", "gmail oauth agent", "agent send email on my behalf", "email assistant inbox triage AI", "email mcp", "agent inbox", "imap", "gmail api oauth", "AI email assistant (Lemmy)", "thunderbird AI (Lemmy, disagreement)", "email mcp imap smtp (GitHub)" · unreachable: YouTube (429 Too Many Requests, then redirect to a sorry page), Reddit (challenge page), Mastodon (search needs login)

### V001 · Hacker News (When does MCP make sense vs CLI?) · adjacent · posted 2026-03-01 · fetched 2026-10-24 · via fetch
> I hate MCP servers
>
> That said the core argument for MCP servers is providing an LLM a guard-railed API around some enterprise service. A gmail integration is a great example. Without MCP, you need a VM as scratch space, some way to refresh OAuth, and some way to prevent your LLM from doing insane things like deleting half of your emails. An MCP server built by trusted providers solves all of these problems.
>
> But that's not what happened.
>
> Developers and Anthropic got coked up about the whole thing and extended the concept to nuts and bolts. I always found the example servers useless and hilarious.[0] Unbelievably, they're still maintained. …
<https://news.ycombinator.com/item?id=47211483>

### V002 · Hacker News (When does MCP make sense vs CLI?) · adjacent · posted 2026-03-02 · fetched 2026-10-24 · via fetch
> Imagine asking to your favorite LLM the following: "get the document attached to the most recent email from Joe and then upload it into my document management system in a new folder within archive 'Important', make sure to name the folder based the topic of the document following the naming convention already in place for folders in the same archive"
>
> This could be possible for the average user after activating the appropriate "email" and "document management" MCP servers in their chat interface - maybe following an activation process similar to that of Alexa skills.
>
> How could a regular user achieve the same via CLI? Where would the CLI process be running?
<https://news.ycombinator.com/item?id=47215558>

### V003 · Hacker News (Skills for organizations, partners, the ecosystem) · creator · posted 2025-12-18 · fetched 2026-10-24 · via fetch
> I've built a number of MCP servers, including an MCP wrapper. I'd generally recommend you skip it unless you know you need it. Conversely, I'd generally recommend you write up a couple skills ASAP to get a feel for them. It will take you 20 minutes to write and test some.
>
> MCP does three things conceptually: it lets you build a bridge between an agent and <something else>, it specifies a UI+API layer between the bridge and the LLM, and it formalizes the description of that bridge in a tool-calling format.
>
> It's that UI+API layer that's the biggest pain in the ass, in my opinion. …
<https://news.ycombinator.com/item?id=46318244>

### V004 · Hacker News (NeuralMail: Open-source tool to search all your emails with LLMs) · buyer · posted 2025-08-23 · fetched 2026-10-24 · via fetch
> Great work! Could this use a JMAP MCP to support FastMail?
>
> Show HN: JMAP MCP – Email for your agents - https://news.ycombinator.com/item?id=44915220 - August 2025
>
> Show HN: An mcp server for jmap email clients - https://news.ycombinator.com/item?id=44088492 - May 2025
<https://news.ycombinator.com/item?id=44998846>

### V005 · Hacker News (Ask HN: What email provider do you recommend for personal email?) · buyer · posted 2026-08-11 · fetched 2026-10-24 · via fetch
> Fastmail. They offer an MCP server, but keep the AI features out of the product. Data export is available and trivial.
>
> An MCP Server for Fastmail – National Email Day - https://news.ycombinator.com/item?id=47870988 - April 2026 (14 comments)
>
> https://www.fastmail.help/hc/en-us/articles/360060590573-Download-all-your-data
<https://news.ycombinator.com/item?id=49261955>

### V006 · Hacker News (Cloudflare Email Service) · adjacent · posted 2026-04-16 · fetched 2026-10-24 · via fetch
> > It looks like they focused on receiving emails
>
> That's wild. $6M for an MCP server for SMTP?
<https://news.ycombinator.com/item?id=47799249>

### V007 · Hacker News (Saying goodbye to asm.js) · adjacent · posted 2026-05-20 · fetched 2026-10-24 · via fetch
> > we should all be running our untrustworthy AI tools and their outputs in precisely such a sandbox
>
> The DevOps infrastructure Kubernetes runbook AI inference router API people (DIK-AROUnders for short) always want an abstract technical solution that increases both their budget and their distance from the end user's actual application. Like the more money they get to dick around with meaningless technical cathedrals, the better. They're only bent out of shape that they couldn't parlay that into a sweet crypto scheme. In the real world, the line between what users actually want and what DIK-AROUnders call inauthentic activity is quite blurred. …
<https://news.ycombinator.com/item?id=48211796>

### V008 · Hacker News (Launch HN: April [YC S25] – Voice AI to manage your email and calendar) · buyer · posted 2025-08-25 · fetched 2026-10-24 · via fetch
> Absolutely, having the AI agent write out a draft and leave it there, or better yet grant it read-only access to my email and have it draft email responses and store it somewhere else where I can retrieve it would be fantastic.
>
> AI is still not at the point where I am comfortable letting it run free with my email, but a draft that I can read over and make changes to before sending it out is a game changer.
<https://news.ycombinator.com/item?id=45017881>

### V009 · Hacker News (Muse – Meta’s personal AI agent) · buyer · posted 2026-09-09 · fetched 2026-10-24 · via fetch
> It's hilarious that Meta made a good AI integration for Gmail before Google did.
>
> For a while now I've had a startup idea for an agent that would monitor your inbox for content-free notification emails that just say "you have a new message, click here to read it" or "package delivered" with no details about the package contents. Then it would login to the website, do the 2FA dance, click through the UI, extract the actual important information, and put it back in my email inbox where it should have been in the first place.
>
> I haven't worked on this idea because I think general purpose AI agents are likely to be able to do it very soon. And it seems like Muse is almost there already. …
<https://news.ycombinator.com/item?id=49619228>

### V010 · Hacker News (Meta's Muse Is an Adorable Privacy and Security Dumpster Fire) · adjacent · posted 2026-10-06 · fetched 2026-10-24 · via fetch
> You don't have to, there is a world of things you can do with them without giving them access to your email or bank account.
>
> "Hermes, clone this android app to my computer, add this and this feature and fix this annoyance and then rebuild it and push it to my phone"
>
> "Hermes summarize this YouTube podcast and push the summary and transcript to my Obsidian vault"
>
> "Hermes check mg obsidian notes for when I last wrote a blog article about Neovim's integration with AI agents"
>
> *Hermes,  you have an API token that allows read only access to the Zabbix monitoring system, check that and then use the Proxmox API token that only allows you to do limited actions to reboot the VM that is having issue …
<https://news.ycombinator.com/item?id=49978751>

### V011 · Hacker News (Show HN: Agent.email – sign up via curl, claim with a human OTP) · creator · posted 2026-05-21 · fetched 2026-10-24 · via fetch
> AgentMail provides the IMAP+SMTP server. Other email providers ban email accounts created for agents, while that is what AgentMail is designed for.
<https://news.ycombinator.com/item?id=48229122>

### V012 · Hacker News (Claude Fable is relentlessly proactive) · adjacent · posted 2026-06-12 · fetched 2026-10-24 · via fetch
> Claude typically recommends .env files for storing secrets. You use one to store a refresh token for the Gmail API or IMAP connection details. Your agent uses an MCP server you configured during a session, but the MCP server has been compromised and directs the agent to do nasty stuff with env dotfiles.
<https://news.ycombinator.com/item?id=48500030>

### V013 · Hacker News ([dead]) · creator · posted 2026-03-19 · fetched 2026-10-24 · via fetch
> Most AI agents can send emails, but there is no way to receive emails from real humans and reply back.
>
> That's where RegalMail comes in. It allows AI agents to connect with IMAP/SMTP email boxes. It supports IMAP IDLE, meaning emails are pushed, rather than polled. It also supports sending replies with the correct threading.
>
> Billing: RegalMail offers a free plan with 200 emails/month, a Pro plan at $15/month (10,000 emails, 5 mailboxes), and a Business plan at $49/month (50,000 emails, 25 mailboxes).
>
> RegalMail can be used as a plugin with OpenClaw or as a standalone tool via npm (npm install regalmail). It's licensed under the permissive MIT license. …
<https://news.ycombinator.com/item?id=47446474>

### V014 · Hacker News (AI-powered email agent that syncs your emails via IMAP) · buyer · posted 2026-08-26 · fetched 2026-10-24 · via fetch
> AI-powered email agent that syncs your emails via IMAP and provides intelligent analysis 
> Interesting to analyse 20+ years of my gmail account.
> Fork the repo and make it better, this is created with AI
<https://news.ycombinator.com/item?id=49446160>

### V015 · Hacker News (Thunderbird for iOS) · adjacent · posted 2026-10-14 · fetched 2026-10-24 · via fetch
> I do think 2027 might be the year that JMAP finally gets wider adoption!  Between Thunderbird using Stalwart for their hosted product, and the fact that the new agentic tools are very good at writing JMAP integrations, I expect plenty of much better JMAP tooling.
>
> I'm also close to a much more releasable version of the proxy which was first written back in 2014: https://github.com/jmapio/jmap-perl/ -- which can wrap existing IMAP/CalDAV/CardDAV/Submission infrastructure so you can access it via JMAP.
<https://news.ycombinator.com/item?id=50081049>

### V016 · Hacker News (Show HN: TabMail. Open-source AI email for Thunderbird and iPhone) · adjacent · posted 2026-09-17 · fetched 2026-10-24 · via fetch
> I think your readme explains the product better than the homepage. "Summaries, drafting, triage, and a chat agent for your existing Gmail, Outlook, iCloud, and IMAP" told me more in one line than the hero on the home "Tap, Talk, Send" did, and I had to scroll to figure out the rest. Great project, love to see it!
<https://news.ycombinator.com/item?id=49735530>

### V017 · Hacker News (Ask HN: What are you working on? [August 2026]) · creator · posted 2026-08-10 · fetched 2026-10-24 · via fetch
> I'm working on self-hosted local email infrastructure for agents and apps: https://github.com/churichard/fluxmail
>
> It consists of a MCP server, a CLI, and a REST API. Everything is run and hosted locally on your computer. You can use the MCP server to give your AI agents access to email, use the CLI to interact with your email, or build your own email apps on top of the REST API.
>
> The goal is to make it simple and easy to interact with your email through any interface you choose, and to give you control over the way that you use your email.
>
> It supports Gmail, Outlook, and IMAP/SMTP. Give it a try and let me know what you think!
<https://news.ycombinator.com/item?id=49243884>

### V018 · Hacker News (OpenClaw – Moltbot Renamed Again) · adjacent · posted 2026-02-02 · fetched 2026-10-24 · via fetch
> Great points on the Docker setup - that's definitely the right approach for limiting blast radius. For Gmail/Calendar, I've found a few approaches that work well:
>
> 1. Use Gmail's delegate access feature instead of full OAuth. You can give OpenClaw read-only or limited access to a primary account from a separate service account.
>
> 2. Set up email filters to auto-label sensitive emails (banking, crypto, etc.) and configure OpenClaw to skip those labels. It's not perfect but adds a layer.
>
> 3. Use Google's app-specific passwords with scope limitations rather than full OAuth tokens. …
<https://news.ycombinator.com/item?id=46855817>

### V019 · Hacker News (MCP Is a Fad) · adjacent · posted 2025-12-13 · fetched 2026-10-24 · via fetch
> Non-technical end users love MCP. Usage in Copilot Studio makes life super easy for them -- they don't have to figure out what connector to use, just plop the Email MCP server in there and they can start asking email-related questions.
>
> Not sure where the "doesn't deliver" for end users comes from.
<https://news.ycombinator.com/item?id=46257291>

### V020 · Hacker News (How I Use "AI") · buyer · posted 2024-08-04 · fetched 2026-10-24 · via fetch
> LLM is the best human to computer interface I have ever seen.
>
> Together with voice to text through whisper for example we broke the UI barrier.
>
> It takes a little bit of time to rebuild our ecosystem but llms are game changer already.
>
> I'm waiting for a finetuned none fact knowing small LLM which knows everything it needs to know for this specific task.
>
> And I'm waiting until everything critical is rewritten so I can use one ai agent to control my bank, calendar, emails and stuff.
>
> Perhaps through banking read only account permissions or whatnot.
<https://news.ycombinator.com/item?id=41151496>

### V021 · X (post) · buyer · posted 2026-10-05 · fetched 2026-10-24 · via connector
> @hrudolph @openclaw Most usecases don’t need more than 6: email-mcp, email-vector-mcp, paperless-mcp, jameica/hibiscus-mcp, vikunja-mcp that would be a classical daily workflow, but there are other combinations with other services …
<https://x.com/souly9999/status/2107202446296584618>

### V022 · X (post) · buyer · posted 2026-10-15 · fetched 2026-10-24 · via connector
> @zeeg Its so bad. I don’t understand how there isn’t agent native email MCP company yet. Would
> pay.
<https://x.com/dee_taylor_dev/status/2110821052972732752>

### V023 · X (post) · creator · posted 2026-10-07 · fetched 2026-10-24 · via connector
> @shipwithtiago same bet here, i shipped an email mcp so the agent calls a tool instead of scraping an inbox. inbound is the harder half, how are you handling that?
<https://x.com/je4ndev/status/2107931335377743901>
Observer note: 1 likes at fetch

### V024 · X (post) · adjacent · posted 2026-10-11 · fetched 2026-10-24 · via connector
> @jarrodwatts What are you impressed with specifically? This could be done year ago with agent from any provider and email MCP. Not sure I understand this Grok Bot posts, if anything this is just a model capability which is here since like Opus 4.5.
<https://x.com/adamdotenv/status/2109311308264816809>

### V025 · X (post) · buyer · posted 2026-09-29 · fetched 2026-10-24 · via connector
> I hired a Chief of Staff this weekend. His name is Bart. He’s an AI. He already knows more about me than any human I've hired.
>
> Not Muse. Not GrokBot. Not “Claude, clean my inbox.”
>
> Bart has 3 companies’ email/Slack/cloud, my personal messages, notes, ~50 investments, thousands https://t.co/9nlZxAfoy4
<https://x.com/travis_cook_/status/2104960620089184357>
Observer note: 2 likes at fetch

### V026 · X (post) · buyer · posted 2026-09-30 · fetched 2026-10-24 · via connector
> @Biohazard3737 I use Claude as my thinking layer and run my own agent, Alfie, on a small cloud server through OpenClaw, where he lives in Telegram, delivers my morning brief, cleans up my inbox, runs a handful of scheduled jobs, and keeps his memory in plain text files I can actually read. The
<https://x.com/nomlastew/status/2105403696817623319>

### V027 · X (post) · buyer · posted 2026-10-22 · fetched 2026-10-24 · via connector
> @Biggs237 An agent reading my inbox would file a complaint by lunch. Claude has been a great architect for my trading loop though, so I will keep the inbox to myself.
<https://x.com/TangoTurtleA/status/2113395309485449643>
Observer note: 1 likes at fetch

### V028 · X (post) · buyer · posted 2026-09-25 · fetched 2026-10-24 · via connector
> I've come to the stark realization that I no longer own my Inbox. A Claude session an Agent are my clerk and intern.
<https://x.com/glenegrant/status/2103520390215864757>

### V029 · X (post) · buyer · posted 2026-09-25 · fetched 2026-10-24 · via connector
> @seth_stafford @cosminnegruseri well, agent time is cheap, they can just read everything. I noticed a couple of weeks ago that Claude reads my emails, and they remain marked unread in my inbox. But it surfaces the important parts, so I still get them.
<https://x.com/yaroslavvb/status/2103602181605871781>
Observer note: 1 likes at fetch

### V030 · X (post) · buyer · posted 2026-10-14 · fetched 2026-10-24 · via connector
> Sort my inbox from the last 7 days: needs my reply, warm leads, can wait.
>
> That is the whole prompt. Claude Code goes through the week's chats and gives each one a bucket and a one-line reason, so I start with the ones that need me.
>
> Set it up by literally telling your agent to https://t.co/D0VpKXOsd7
<https://x.com/RaphaelRedmer/status/2110397323813560418>
Observer note: 12 likes at fetch

### V031 · X (post) · brand · posted 2026-10-23 · fetched 2026-10-24 · via connector
> @AnthropicAI's Claude Duet is out in research preview: an agent that watches your apps and asks before it sends, pays or deletes. I'm on the waitlist, but in the EU, so it'll be a while. My inbox is already in AI hands. Would you let one book your holidays or pick your hotel? https://t.co/6sVpmPmLZR
<https://x.com/chrispapa/status/2113691945834791029>

### V032 · X (post) · buyer · posted 2026-10-11 · fetched 2026-10-24 · via connector
> Things I stopped doing by hand this year
>
> • Sorting my inbox
> → AI agent
> • Repurposing content
> → AI workflow
> • Designing carousels
> → Claude code
> • Researching competitors
> → AI agent
> • Planning content
> → AI agent
> • Pulling reports
> → AI agent, every week https://t.co/lRSTI0AXw4
<https://x.com/realsamhorton/status/2109397111691440200>
Observer note: 2 likes at fetch

### V033 · GitHub (Chatforest/chatforest.com issue #2) · creator · posted 2026-10-20 · fetched 2026-10-24 · via fetch
> Suggestion for https://chatforest.com/guides/best-email-mcp-servers/: a hosted multi-provider option.
>
> The multi-provider IMAP/SMTP section lists self-hosted servers only (codefuturist/email-mcp, marlinjai/email-mcp). MCP Emails (source: https://github.com/Albretsen/MCPEmails, AGPL-3.0) is a hosted remote server at https://mcpemails.com/api/mcp (Streamable HTTP, OAuth for the MCP client, or a scoped API key). It connects Gmail (Google app password over IMAP), Outlook and Microsoft 365 (Microsoft sign-in), iCloud, Yahoo, Fastmail, Zoho and any IMAP mailbox, with 19 tools. The same server can also be self-hosted with the Docker stack in `self-host/`. …
<https://github.com/Chatforest/chatforest.com/issues/2>
Observer note: issue title: best-email-mcp-servers: hosted multi-provider option (MCP Emails)

### V034 · GitHub (chatmcp/mcpso issue #5129) · creator · posted 2026-10-11 · fetched 2026-10-24 · via fetch
> Email for any IMAP mailbox, including Outlook and Microsoft 365 through browser sign-in. Search, read and draft, with every message fenced as untrusted input, warnings for hidden text, lookalike letters and injected instructions, and sending refused until an allowlist names who may be written to.
>
> Local stdio server: `npx -y pylos-mcp`, or the one-click Claude Desktop bundle on the [releases page](https://github.com/adamVass/pylos-mcp/releases/latest).
>
> - Repo: https://github.com/adamVass/pylos-mcp
> - npm: [pylos-mcp](https://www.npmjs.com/package/pylos-mcp)
> - MCP registry: io.github.adamVass/pylos-mcp
> - License: MIT
<https://github.com/chatmcp/mcpso/issues/5129>
Observer note: issue title: Submit MCP Server: pylos-mcp (io.github.adamVass/pylos-mcp)

### V035 · GitHub (doemefu/homelab-mcp-hub issue #52) · creator · posted 2026-10-22 · fetched 2026-10-24 · via fetch
> Follow-up from the WP13b review (#44, security advisor T15-3). On Graph a failed `get_message_status` batch logs one `provider_call_failed` WARNING (error class only, first throttle per call). On IMAP a `NO` on a location or lookup batch marks the affected refs `incomplete_search` or `thread_checked: false` but logs nothing, so a systematic server refusal stays invisible to the operator.
>
> Scope: one capped WARNING per IMAP call when at least one batch failed, with the existing log fields (spec 080 §9.7; never values), plus a log-field test. Observability only; results are already correct.
<https://github.com/doemefu/homelab-mcp-hub/issues/52>
Observer note: issue title: [Task] mcp-hub: log failed IMAP status batches

### V036 · GitHub (chatmcp/mcpso issue #5991) · brand · posted 2026-10-23 · fetched 2026-10-24 · via fetch
> **Name:** Fluxmail Cloud
> **Type:** MCP Server (remote)
> **Website:** https://fluxmail.ai/cloud
> **Endpoint:** https://cloud.fluxmail.ai/mcp (Streamable HTTP, OAuth)
> **Docs:** https://fluxmail.ai/docs/cloud/mcp
> **Official MCP Registry:** ai.fluxmail/cloud
> **Icon:** https://fluxmail.ai/icon-512x512.png
>
> Fluxmail Cloud is a hosted MCP server for your existing Gmail, Outlook and IMAP mailboxes. Sign in with OAuth, choose which mailboxes each connection can reach, and select read-only, read-write or full mail access. Agents can search, read, draft, send, forward and organize mail. Paid plans start at $15 a month with a seven-day trial. …
<https://github.com/chatmcp/mcpso/issues/5991>
Observer note: issue title: Submit Remote MCP Server: Fluxmail Cloud (ai.fluxmail/cloud)

### V037 · DEV (comment on "Why I Built an Email AI That Never Sends") · buyer · posted 2026-03-15 · fetched 2026-10-24 · via fetch
> Love the privacy-first approach. The idea of an AI that processes locally without sending data externally is exactly the direction more tools should go.
>
> This resonates with what we see in the browser privacy space too. Most people don't realize how much data their browser leaks through fingerprinting — canvas rendering, WebGL info, audio processing signatures — all without any explicit permission. The parallel is clear: data should be processed locally whenever possible.
>
> Really clean execution on this project. Would be curious to know what local LLM you're using under the hood.
<https://dev.to/firekey_browser/comment/35ibg>

### V038 · DEV (comment on "Why I Built an Email AI That Never Sends") · buyer · posted 2026-03-16 · fetched 2026-10-24 · via fetch
> I don't receive enough emails now to make this worthwhile for me, but I absolutely love the concept and the way you've implemented it.  An excellent way to use AI.
>
> And, most importantly, well done on a sensible pricing policy rather than the stupid pricing methods we usually have to live with.
<https://dev.to/diso/comment/35jcd>

### V039 · DEV (comment on "What email APIs cost in 2026: 7 workloads priced on 6 providers") · adjacent · posted 2026-10-13 · fetched 2026-10-24 · via fetch
> Putting the same seven workloads next to each other is the useful part — most of these pages are impossible to compare otherwise. At early SaaS volume SES is basically free, but did deliverability or support ever push you off it toward something like Postmark?
<https://dev.to/posting-dude/comment/3hk2g>

### V040 · DEV (comment on "What email APIs cost in 2026: 7 workloads priced on 6 providers") · adjacent · posted 2026-10-20 · fetched 2026-10-24 · via fetch
> Your cost breakdown is the honest version — SES wins on price at every volume, then hands you the webhooks, logs and templates to build yourself. That build-it-yourself layer is what I'm working on with rootmail: per-message delivery state on top of SES instead of raw events. Invite-only beta right now — happy to open a seat if you want to see how the numbers change when the plumbing's already there.
<https://dev.to/robertpaschal/comment/3ic15>

### V041 · Lemmy (comment on "Proton Mail says that the new Outlook app for Windows is Microsoft's n" [privacy]) · buyer · posted 2024-04-05 · fetched 2026-10-24 · via fetch
> >You cannot use the new Outlook app without syncing these data with Microsoft's servers, i.e. your usernames and passwords are sent to the company's cloud servers. While the data is sent using TLS, the IMAP and SMTP username and password are sent to Microsoft in plain text. This could allow the company to access your emails, and share the data with third-parties.
>
> Not only that, but sending usernames and passwords in plaintext allows for MITM attacks.
<https://lemmy.world/comment/9094190>
Observer note: score 83 at fetch

### V042 · Lemmy (comment on "Proton Mail says that the new Outlook app for Windows is Microsoft's n" [privacyguides]) · buyer · posted 2024-01-14 · fetched 2026-10-24 · via fetch
> It also sends your IMAP credentials to their servers and receives the mail there, it's not done locally like the older versions.
<https://lemmy.world/comment/6694118>
Observer note: score 82 at fetch

### V043 · Lemmy (comment on "Microsoft lays hands on login data: Beware of the new Outlook" [technology]) · buyer · posted 2023-11-10 · fetched 2026-10-24 · via fetch
> I mean, duh!!
>
> It’s a web version wrapped in some god-awful semi-native wrapper. Everything the app does is stored on the server. So, yes, like gmail, if you give it access to another IMAP account, the password is stored on the server BECAUSE EVERYTHING IS. 
>
> This isn’t a scandal. It shouldn’t be news. 
>
> The bigger discussion why are we pretending a server driven mail client is local?
<https://lemmy.world/comment/5219739>
Observer note: score 76 at fetch

### V044 · Lemmy (comment on "Fedora Linux 43 exposes 20-year-old Microsoft Outlook security failure" [technology]) · adjacent · posted 2026-06-07 · fetched 2026-10-24 · via fetch
> Someone who's still using POP instead of IMAP4  probably hasn't updated their setup in 20 years.
>
> This is a good reminder to use the secure ports for IMAP (993) and SMTP (465). **Don't** use ports that use opportunistic TLS (STARTTLS), which are 143 for IMAP and 587 for SMTP. These start unencrypted and switch to using encryption once the server says it supports it. An attacker can just modify the response and say the server doesn't support encryption, in which case the connection will remain unencrypted. https://en.wikipedia.org/wiki/Opportunistic_TLS#Weaknesses_and_mitigations
>
> You can force encryption on the client side... …
<https://lemmy.world/comment/24134365>
Observer note: score 66 at fetch

### V045 · Lemmy (comment on "The devil did this." [iiiiiiitttttttttttt]) · adjacent · posted 2025-03-29 · fetched 2026-10-24 · via fetch
> Sounds about right.  
>
> Pro tip, set up a rule in your email client to send any email that contains the following phrases, phishme.com or knowb4, in the header to junk.  
>
> Note that I said header, not From field.   
> It is so stupid that orgs spend thousands of dollars on these products and you can be seen as not being a phishing risk because of their shitty systems.
<https://lemmy.world/comment/16099882>
Observer note: score 62 at fetch

### V046 · Lemmy (comment on "tech support" [lemmyshitpost]) · adjacent · posted 2024-06-07 · fetched 2026-10-24 · via fetch
> Ok but anybody with a zero inbox is just shunting off most of their mail to subfolders they will never open.  That's more organized, but it belies a general problem with email.  
>
> Also, your email client shouldn't be loading all of your messages.  It shouldn't matter to your iPhone how many unread emails are in your inbox.  If there's something *your* company is doing that requires an iPhone to open 130,000 emails, then it is absolutely your company's fault.
<https://lemmy.world/comment/10505227>
Observer note: score 55 at fetch

### V047 · Lemmy (comment on "Thunderbird Launches Open Source Services to Rival Gmail and Office365" [opensource]) · buyer · posted 2025-04-03 · fetched 2026-10-24 · via fetch
> Ok, this part is pretty cool:
>
> >Thunderbird Assist will also be available. This experimental feature, developed in collaboration with Flower AI, offers optional artificial intelligence functionalities for users who want them while also addressing privacy concerns head-on. **On devices robust enough to handle AI models locally, Thunderbird Assist processes everything on the user’s own machine.**
> >
> >However, for users on less powerful hardware, the development team has integrated NVIDIA’s confidential computing to keep any remote processing secure. Rest assured, those who prefer to skip AI services can continue using Thunderbird without these extras. …
<https://lemmy.world/comment/16216618>
Observer note: score 88 at fetch

### V048 · Lemmy (comment on "public services of an entire german state switches from Microsoft to o" [technology]) · buyer · posted 2025-06-02 · fetched 2026-10-24 · via fetch
> I switched to Thunderbird about a year and a half ago.
>
> Last week I had to help a coworker with their Outlook and holy shit is it so much worse than when I dropped it. There is so much AI garbage in every little thing and bad design getting in the way of just sending and receiving emails.
>
> Same thing for the other office products
<https://lemmy.world/comment/17413675>
Observer note: score 47 at fetch

### V049 · Lemmy (comment on "Today in “Google Broke Email”" [technology]) · adjacent · posted 2025-12-30 · fetched 2026-10-24 · via fetch
> He's being a bit whiny here. He was having employees use Gmail as a client for his self-hosted POP mail, which is a niche use case that likely has a brittle implementation and doesn't make any money for Google. Gmail offers a paid product for this kind of use case, but it won't integrate with the rest of his (likely custom) automation. He wants to self-host parts of the system and have Google do the messy bits, but he's not their customer and probably isn't a very good product either.
>
> He then complains that to self-host IMAP:
>
> >  My server is now responsible for storing all of their messages, including all of their spam. It is a vast amount of data. I will have to implement quotas. …
<https://lemmy.world/comment/21274629>
Observer note: score 104 at fetch

### V050 · Bluesky (post) · adjacent · posted 2026-10-21 · fetched 2026-10-24 · via fetch
> Yes, and postmark-mcp passed all three: authenticated client, authorized tool, every email readable outside. None of those checks sees the problem. The one that does is at the action: where is this data going, and did anyone review this version of the server.
<https://bsky.app/profile/nawi-n9.bsky.social/post/3myf42nnsds25>

### V051 · Bluesky (post) · adjacent · posted 2026-10-20 · fetched 2026-10-24 · via fetch
> Same feeling. postmark-mcp shipped clean versions up to 1.0.15, then 1.0.16 added one line that BCC’d every email to an outside address. Nobody re-reviews the 16th update of a server that already works. Pinning the version you actually reviewed is the cheap fix.
<https://bsky.app/profile/nawi-n9.bsky.social/post/3mycbg3gpx22z>
Observer note: 1 likes at fetch

### V052 · Bluesky (post) · buyer · posted 2026-10-19 · fetched 2026-10-24 · via fetch
> ProtonMail has finally gotten me to the point where I'm just writing my own E-Mail client with integration points...
>
> - Email
> - Calendar
> - Scheduling
> - Notion support
>
> With easy to access from MCP, CLI, ... Just need a good email client and one my hermes can use
<https://bsky.app/profile/jovidecroock.com/post/3mya63smvvs2q>
Observer note: 15 likes at fetch

### V053 · Bluesky (post) · adjacent · posted 2026-10-23 · fetched 2026-10-24 · via fetch
> The fix is limiting what the AI can do
>
> An assistant that can only read email cannot be tricked into sending it. Least privilege and a human yes for risky actions do more than any filter.
>
> https://fairbydesign.org/prompt-injection-explained/
<https://bsky.app/profile/fairbydesign-org.bsky.social/post/3mykacxq7x325>

### V054 · Bluesky (post) · adjacent · posted 2026-10-22 · fetched 2026-10-24 · via fetch
> New AI assistants are offering to read your email and calendar so they can help more. (Google's Gemini in the car, Anthropic's new Claude Duet.)
>
> Would you let an AI assistant read your inbox? Yes, no, or "depends on what it gets in return"? #AI
<https://bsky.app/profile/awesomeaieveryday.bsky.social/post/3mygqrdlo2e2u>
Observer note: 1 likes at fetch

### V055 · Bluesky (post) · adjacent · posted 2026-10-23 · fetched 2026-10-24 · via fetch
> The coinflip game I am now playing in my work inbox: "Is this an AI agent, or the worst possible low-English outsourcing money can buy"
<https://bsky.app/profile/kcoxdc.bsky.social/post/3mykipxhgoc2x>
Observer note: 5 likes at fetch

### V056 · Bluesky (post) · adjacent · posted 2026-10-23 · fetched 2026-10-24 · via fetch
> Checking your inbox while you sleep sounds lovely until you picture waking up to decisions you never quite approved. The episodes we do at MuseFM.lol keep coming back to that morning review, what an agent drafted, sent, or left alone, because that summary is where trust gets built.
<https://bsky.app/profile/musefm.bsky.social/post/3myk6w3r6js2r>

### V057 · Bluesky (post) · adjacent · posted 2026-10-22 · fetched 2026-10-24 · via fetch
> My guess is it's about trust boundaries: an agent that watches your inbox and acts in the background feels different from a chat window, so its permissions and approvals get their own space. Fair point that it's one more app to juggle, though.
<https://bsky.app/profile/aireadyhub.bsky.social/post/3myije3v4yy2k>

### V058 · Bluesky (post) · creator · posted 2026-10-22 · fetched 2026-10-24 · via fetch
> your agent wants to read your inbox. and export your contacts.
>
> foxgate asks you first, for the exact action.
>
> github.com/pooriaarab/...
<https://bsky.app/profile/pooriaar.bsky.social/post/3myi276eapy2j>

### V059 · Bluesky (post) · creator · posted 2026-10-22 · fetched 2026-10-24 · via fetch
> My AI agent writes my emails. It can never send them.
>
> It reads my inbox and writes drafts straight to my draft folder. It can never send, never delete, and it never sees my mail password.
>
> MoltenMail by MoltenRock: moltenrock.com
<https://bsky.app/profile/captainpuru.bsky.social/post/3myhpy6sxql2h>
Observer note: 1 likes at fetch

### V060 · Bluesky (post) · buyer · posted 2026-10-23 · fetched 2026-10-24 · via fetch
> actually all software should be good. but i only need a web imap frontend right now
<https://bsky.app/profile/risipieces.cd-rom.net/post/3myl4667wpg2n>
Observer note: 1 likes at fetch

### V061 · Bluesky (post) · buyer · posted 2026-10-23 · fetched 2026-10-24 · via fetch
> does anyone know a web mail frontend that is good. something i can throw on my server and have imap/pop3 in the browser
<https://bsky.app/profile/risipieces.cd-rom.net/post/3myl3ppfoxw2n>
Observer note: 1 likes at fetch

### V062 · Bluesky (post) · buyer · posted 2026-07-19 · fetched 2026-10-24 · via fetch
> I recently created a Google Cloud project just to use the Gmail API. The number of magic-constant oauth forms to fill out is nuts. I can't believe it's still this bad.
<https://bsky.app/profile/nick-santos.com/post/3mqyzxjdt422g>

### V063 · Bluesky (post) · adjacent · posted 2026-10-23 · fetched 2026-10-24 · via fetch
> So setzt es sich fort. Proprietäre APIs überall, Standards fehlen. Nutzen ChatGPT & Co. IMAP und POP3, FTP oder SCP? Wohl kaum. Warum auch - geschlossene Konnektoren binden Kunden fester als jeder Vertrag.
<https://bsky.app/profile/mattication.bsky.social/post/3myjwblvuiq2f>

### V064 · Bluesky (post) · adjacent · posted 2026-10-20 · fetched 2026-10-24 · via fetch
> And for EU teams that BCC is not only a security incident: every copied email is a personal data breach, with 72 hours to notify the regulator. Pinning helps, plus a lockfile and reading the diff of any MCP server that touches customer data before bumping it.
<https://bsky.app/profile/stacklegal.bsky.social/post/3mycdfzbhii22>
Observer note: 3 likes at fetch
