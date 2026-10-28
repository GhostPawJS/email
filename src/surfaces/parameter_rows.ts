import type { JsonSchema } from './surface_types.ts';

/** Render nested parameters consistently for skill and describe output. */
export function parameterRows(schema: JsonSchema, prefix = ''): string[] {
	const rows: string[] = [];
	const properties = { ...schema.properties };
	for (const branch of schema.oneOf ?? []) Object.assign(properties, branch.properties);
	for (const [name, property] of Object.entries(properties)) {
		const alternatives = [property, ...(property.oneOf ?? [])];
		for (const branch of schema.oneOf ?? []) {
			const nested = branch.properties?.[name];
			if (nested) alternatives.push(nested, ...(nested.oneOf ?? []));
		}
		const nested: JsonSchema = { properties: {}, required: [] };
		for (const alternative of alternatives) {
			Object.assign(nested.properties ?? {}, alternative.properties);
			nested.required = [...new Set([...(nested.required ?? []), ...(alternative.required ?? [])])];
		}
		const keys = Object.keys(nested.properties ?? {});
		const type =
			property.type ?? property.oneOf?.map((branch) => branch.type ?? 'any').join(' / ') ?? 'any';
		const fallback = keys.length
			? `Object: ${keys.map((key) => key + (nested.required?.includes(key) ? ' (required)' : '')).join(', ')}.`
			: property.items
				? `Array of ${property.items.type ?? 'values'}.`
				: `${type} value.`;
		const description = (
			(property.enum ? `${property.enum.join(', ')}. ` : '') +
			(property.description?.trim() || fallback)
		)
			.replaceAll('|', '\\|')
			.replaceAll('\n', ' ');
		rows.push(
			`| ${prefix}${name} | ${type} | ${schema.required?.includes(name) ? 'yes' : 'no'} | ${description} |`,
		);
		if (keys.length) rows.push(...parameterRows(nested, `${prefix}${name}.`));
		if (property.items) rows.push(...parameterRows(property.items, `${prefix}${name}[].`));
	}
	return rows;
}
