import { deletePeopleByEmail } from './support/attio-cleanup';
import { expect, test } from './support/fixtures';

/**
 * One happy path executed from the editor. The point is not CRUD coverage — the
 * unit suite and the live REST pass already have that — but that the editor's own
 * run button wires credential, parameters and output panel together correctly.
 *
 * This creates a real record in Attio and deletes it afterwards.
 */

test.describe('executing from the editor', () => {
	const email = `e2e-ui-${Date.now()}@nodrel.dev`;

	test.afterAll(async () => {
		await deletePeopleByEmail(email);
	});

	test('Create a record returns a record id in the output panel', async ({ seed, ndv }) => {
		const node = await seed({
			name: 'execute create record',
			parameters: {
				resource: 'record',
				operation: 'create',
				object: 'people',
				values: JSON.stringify({
					name: [{ first_name: 'E2E', last_name: 'UI', full_name: 'E2E UI' }],
					email_addresses: [{ email_address: email }],
				}),
			},
		});

		await ndv.open(node.ndvPath);
		await ndv.executeNode();

		const output = await ndv.outputText();
		expect(output).toContain('record_id');
		expect(output).not.toMatch(/error/i);
	});

	/**
	 * Regression: Search used to ship a Limit default of 50, but Attio's search
	 * endpoint caps `limit` at 25 — so the operation 400'd on its own defaults.
	 * This deliberately fills only the required params and leaves Limit untouched,
	 * because the defaults are exactly what was broken.
	 */
	test('Search succeeds on its default Limit', async ({ seed, ndv }) => {
		const node = await seed({
			name: 'execute search defaults',
			parameters: {
				resource: 'record',
				operation: 'search',
				query: 'a',
				searchObjects: ['companies'],
			},
		});

		await ndv.open(node.ndvPath);
		await ndv.executeNode();

		const output = await ndv.outputText();
		expect(output).not.toMatch(/less than or equal to|too_big|validation/i);
		expect(output).not.toMatch(/error/i);
	});
});
