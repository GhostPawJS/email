import { schemaExample } from './schema_example.ts';
import type { JsonSchema } from './surface_types.ts';

export function validateInput(schema: JsonSchema, input: unknown, path = '$'): string[] {
	const errors = validate(schema, input, path);
	if (path !== '$' || !errors.length) return errors;
	const seed: Record<string, unknown> = {};
	if (input && typeof input === 'object')
		for (const key of ['action', 'view'])
			if (schema.properties?.[key]?.enum?.includes((input as Record<string, unknown>)[key]))
				seed[key] = (input as Record<string, unknown>)[key];
	return errors.map((error) => `${error}; pass ${JSON.stringify(schemaExample(schema, seed))}`);
}

function validate(schema: JsonSchema, input: unknown, path: string): string[] {
	const errors: string[] = [];
	const matchesType = (type: string) => {
		switch (type) {
			case 'object':
				return typeof input === 'object' && input !== null && !Array.isArray(input);
			case 'array':
				return Array.isArray(input);
			case 'integer':
				return typeof input === 'number' && Number.isInteger(input);
			case 'number':
				return typeof input === 'number' && Number.isFinite(input);
			case 'null':
				return input === null;
			default:
				return typeof input === type;
		}
	};
	if (
		schema.type &&
		!(Array.isArray(schema.type) ? schema.type : [schema.type]).some(matchesType)
	) {
		return [`${path}: expected ${String(schema.type)}`];
	}
	if (schema.enum && !schema.enum.some((value) => JSON.stringify(value) === JSON.stringify(input)))
		errors.push(`${path}: expected one of ${JSON.stringify(schema.enum)}`);
	if (schema.oneOf) {
		const branches = schema.oneOf.map((branch) => validate(branch, input, path));
		if (!branches.some((errors) => errors.length === 0)) {
			const record = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
			const selected = schema.oneOf.findIndex((branch) =>
				['action', 'view'].some((key) => branch.properties?.[key]?.enum?.includes(record[key])),
			);
			errors.push(...(branches[selected >= 0 ? selected : 0] ?? []));
		}
	}
	if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
		const record = input as Record<string, unknown>;
		for (const name of schema.required ?? [])
			if (!Object.hasOwn(record, name)) errors.push(`${path}.${name}: required`);
		for (const [name, property] of Object.entries(schema.properties ?? {}))
			if (Object.hasOwn(record, name))
				errors.push(...validate(property, record[name], `${path}.${name}`));
	}
	if (Array.isArray(input) && schema.items)
		input.forEach((value, index) => {
			errors.push(...validate(schema.items as JsonSchema, value, `${path}[${index}]`));
		});
	return errors;
}
