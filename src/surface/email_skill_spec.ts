import { emailSkills } from '../skills/email_skills.ts';
import { emailMcpInstructions } from './email_mcp_instructions.ts';
import { emailSurfaceTools } from './email_surface_tools.ts';
export const emailSkillSpec = {
	name: 'email',
	description:
		'Read, search, compose, organize and synchronize email with a local SQLite cache. Use when managing email or searching cached messages.',
	license: 'MIT',
	compatibility: 'Node.js 24 or newer. MCP stdio or email CLI.',
	bin: 'ghostpaw-email',
	packageName: '@ghostpaw/email',
	server: 'ghostpaw-email',
	about: emailMcpInstructions,
	tools: emailSurfaceTools,
	workflows: [...emailSkills, { name: 'cli', description: 'Complete existing email CLI guide.' }],
	principles: [
		'Inspect before changing messages.',
		'Confirm recipients and content before sending.',
	],
};
