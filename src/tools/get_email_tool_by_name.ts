import { emailTools } from './email_tools.ts';

export function getEmailToolByName(name: string) {
	return emailTools.find((tool) => tool.name === name);
}
