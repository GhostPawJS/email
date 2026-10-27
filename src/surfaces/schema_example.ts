import type { JsonSchema } from './surface_types.ts';

export function schemaExample(schema: JsonSchema, seed: Record<string, unknown> = {}): unknown {
	if (schema.oneOf) {
		const branch = schema.oneOf.find((candidate) =>
			Object.entries(seed).every(([key, value]) => {
				const values = candidate.properties?.[key]?.enum;
				return !values || values.includes(value);
			}),
		);
		return schemaExample({ ...schema, ...branch, oneOf: undefined }, seed);
	}
	if (schema.enum) return schema.enum[0];
	if (schema.type === 'object') {
		const result = { ...seed };
		for (const key of schema.required ?? [])
			if (!(key in result)) {
				const property = schema.properties?.[key] ?? {};
				const placeholders: Record<string, string> = {
					folder: 'INBOX',
					destination: 'Archive',
					query: 'invoice',
					subject: 'Hello',
					path: 'Projects',
					oldPath: 'Projects',
					newPath: 'Archive/Projects',
				};
				result[key] =
					property.type === 'string' && !property.enum && placeholders[key]
						? placeholders[key]
						: schemaExample(property);
			}
		return result;
	}
	if (schema.type === 'array') return [schemaExample(schema.items ?? {})];
	if (schema.type === 'integer' || schema.type === 'number') return 1;
	if (schema.type === 'boolean') return false;
	return schema.description?.includes('address') ? 'reader@example.com' : 'example';
}
