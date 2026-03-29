import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EmailAuthError, EmailConnectionError, EmailTimeoutError } from '../errors.ts';
import { CliError, handleCliError } from './errors.ts';

describe('CliError', () => {
	it('sets code and exitCode correctly', () => {
		const err = new CliError('no_config', 'No config');
		assert.equal(err.code, 'no_config');
		assert.equal(err.exitCode, 2);
		assert.equal(err.message, 'No config');
	});

	it('uses exit code 1 for user errors', () => {
		assert.equal(new CliError('missing_required_flag', 'x').exitCode, 1);
		assert.equal(new CliError('invalid_flag_value', 'x').exitCode, 1);
		assert.equal(new CliError('body_required', 'x').exitCode, 1);
	});

	it('uses exit code 2 for config errors', () => {
		assert.equal(new CliError('no_config', 'x').exitCode, 2);
		assert.equal(new CliError('account_not_found', 'x').exitCode, 2);
		assert.equal(new CliError('no_default_account', 'x').exitCode, 2);
	});

	it('uses exit code 3 for auth errors', () => {
		assert.equal(new CliError('auth_failed', 'x').exitCode, 3);
	});

	it('uses exit code 4 for network errors', () => {
		assert.equal(new CliError('network_error', 'x').exitCode, 4);
	});

	it('uses exit code 5 for tool errors', () => {
		assert.equal(new CliError('tool_error', 'x').exitCode, 5);
	});

	it('uses exit code 6 for needs_clarification', () => {
		assert.equal(new CliError('needs_clarification', 'x').exitCode, 6);
	});
});

describe('handleCliError', () => {
	it('maps CliError correctly', () => {
		const err = new CliError('no_config', 'No config found');
		const result = handleCliError(err);
		assert.equal(result.exitCode, 2);
		assert.equal(result.message, 'No config found');
	});

	it('maps EmailAuthError to exit code 3', () => {
		const err = new EmailAuthError('Bad password');
		const result = handleCliError(err);
		assert.equal(result.exitCode, 3);
		assert.ok(result.message.includes('Bad password'));
	});

	it('maps EmailConnectionError to exit code 4', () => {
		const err = new EmailConnectionError('Connection refused');
		const result = handleCliError(err);
		assert.equal(result.exitCode, 4);
	});

	it('maps EmailTimeoutError to exit code 4', () => {
		const err = new EmailTimeoutError('Timed out');
		const result = handleCliError(err);
		assert.equal(result.exitCode, 4);
	});

	it('maps unknown Error to exit code 127', () => {
		const err = new Error('Something unexpected');
		const result = handleCliError(err);
		assert.equal(result.exitCode, 127);
	});

	it('maps non-Error to exit code 127', () => {
		const result = handleCliError('something weird');
		assert.equal(result.exitCode, 127);
	});
});
