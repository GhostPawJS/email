export interface EmailSkill {
	name: string;
	description: string;
	content: string;
}

export type EmailSkillRegistry = readonly EmailSkill[];

export function defineEmailSkill<TSkill extends EmailSkill>(skill: TSkill): TSkill {
	return skill;
}
