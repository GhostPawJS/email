import type { FolderRole } from '../types/folder.ts';

const FLAG_MAP: Record<string, FolderRole> = {
	'\\all': 'all',
	'\\archive': 'archive',
	'\\drafts': 'drafts',
	'\\flagged': 'flagged',
	'\\junk': 'junk',
	'\\sent': 'sent',
	'\\trash': 'trash',
};

const NAME_MAP: [RegExp, FolderRole][] = [
	[/^inbox$/i, 'inbox'],
	[
		/^(sent|sent messages|sent items|gesendete objekte?|gesendet|elts envoy[eé]s|envoy[eé]s|enviados|elementos enviados)$/i,
		'sent',
	],
	[/^(drafts?|entw[üu]rfe?|brouillons?|borradores?)$/i, 'drafts'],
	[
		/^(trash|deleted items|deleted messages|papierkorb|gel[öo]schte elemente|corbeille|[eé]l[eé]ments supprim[eé]s|papelera|elementos eliminados)$/i,
		'trash',
	],
	[/^(junk|spam|courrier ind[eé]sirable|correo no deseado)$/i, 'junk'],
	[/^(archive|archiv|archives|archivo)$/i, 'archive'],
	[/^all mail$/i, 'all'],
];

export function detectFolderRole(flags: string[], name: string): FolderRole {
	for (const flag of flags) {
		const role = FLAG_MAP[flag.toLowerCase()];
		if (role !== undefined) return role;
	}
	const baseName = name.split(/[/.]/).pop() ?? name;
	for (const [re, role] of NAME_MAP) {
		if (re.test(baseName)) return role;
	}
	return null;
}
