import { emailVersion } from '../version.ts';

export const emailSkillShort = `# ghostpaw-email cheat sheet
Version: ${emailVersion}

Install (Node 24+):
  npm install -g @ghostpaw/email
Check version:
  ghostpaw-email --version

Configure an account:
  ghostpaw-email account add --name work --imap-host imap.example.com --imap-port 993 --smtp-host smtp.example.com --smtp-port 587 --user reader@example.com --pass PASSWORD
Connect and synchronize:
  ghostpaw-email sync connect
List folders:
  ghostpaw-email read folders
Search cached mail:
  ghostpaw-email mail search "meeting"
Save a draft:
  ghostpaw-email compose draft --save --to reader@example.com --subject Hello --body Hello
Mark a message read:
  ghostpaw-email organize mark-read --folder INBOX --uids 1
List tool names:
  ghostpaw-email tools
Inspect a tool and its parameters:
  ghostpaw-email describe mail_search
Call a tool with JSON:
  ghostpaw-email call mail_search '{"query":"meeting"}'
Start the MCP server:
  ghostpaw-email mcp
Select a cache:
  ghostpaw-email --db ./email.sqlite tools

List workflow guides:
  ghostpaw-email skill --list
Read a guide:
  ghostpaw-email skill cli
Read the full tool reference:
  ghostpaw-email skill
Show this compact cheat sheet:
  ghostpaw-email skill --short
Show skill command help:
  ghostpaw-email skill --help
`;
