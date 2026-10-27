import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateInput } from '../surfaces/validate_input.ts';
import { emailSurfaceTools } from './email_surface_tools.ts';

const inputs: Record<string, Record<string, unknown>> = {
	mail_read: { view: 'folders' },
	mail_search: { query: 'tea' },
	mail_compose: {
		action: 'send',
		input: { to: [{ address: 'you@example.com' }], subject: 'Hello', text: 'Hello' },
	},
	mail_organize: { action: 'trash', folder: 'INBOX', uids: [1] },
	mail_sync: { action: 'sync' },
};
test('every Email schema accepts representative handler inputs and rejects invalid shapes', () => {
	for (const tool of emailSurfaceTools) {
		assert.ok(inputs[tool.name], tool.name);
		assert.deepEqual(validateInput(tool.inputSchema, inputs[tool.name]), [], tool.name);
		assert.ok(validateInput(tool.inputSchema, []).length, tool.name);
		for (const required of tool.inputSchema.required ?? []) {
			const input = { ...inputs[tool.name] };
			delete input[required];
			assert.ok(validateInput(tool.inputSchema, input).length, `${tool.name}.${required}`);
		}
	}
});
