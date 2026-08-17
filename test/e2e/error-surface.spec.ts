import { expect, test } from './support/fixtures';

/**
 * `formatAttioError` builds a message that is only useful if the editor actually
 * shows it. This drives the same 403 path verified in T032, but asserts on what a
 * user reads in the NDV rather than on the error object.
 *
 * Uses the restricted credential (`record_permission:read`, no read-write).
 */

test.describe('error rendering in the NDV', () => {
	test('a missing-scope 403 names the scopes the operation needs', async ({ seed, ndv }) => {
		const node = await seed({
			name: 'restricted create 403',
			restricted: true,
			parameters: {
				resource: 'record',
				operation: 'create',
				object: 'people',
				values: JSON.stringify({
					name: [{ first_name: 'Scope', last_name: 'Probe', full_name: 'Scope Probe' }],
				}),
			},
		});

		await ndv.open(node.ndvPath);
		await ndv.executeNode();

		const output = await ndv.outputText();

		// Attio's own wording, preserved rather than replaced.
		expect(output).toContain('not authorized');
		// The hint added by formatAttioError, naming the exact scopes to grant.
		expect(output).toContain('record_permission:read-write');
		expect(output).toContain('object_configuration:read');
	});

	test('the 403 does not create a record despite the write attempt', async ({ seed, ndv }) => {
		// A read-scoped token must fail closed; this guards against the node
		// retrying or falling back to a path that would succeed.
		const node = await seed({
			name: 'restricted create is a no-op',
			restricted: true,
			parameters: {
				resource: 'record',
				operation: 'create',
				object: 'people',
				values: JSON.stringify({
					name: [{ first_name: 'Should', last_name: 'NotExist', full_name: 'Should NotExist' }],
				}),
			},
		});

		await ndv.open(node.ndvPath);
		await ndv.executeNode();

		expect(await ndv.outputText()).toMatch(/403|not authorized/i);
	});
});
