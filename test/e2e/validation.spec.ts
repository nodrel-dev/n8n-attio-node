import { expect, test } from './support/fixtures';

/**
 * n8n marks a node with `node-issues` when a required parameter is empty, which
 * stops the user before they burn an API call. This depends on `required: true`
 * being set correctly in the descriptions.
 */

test.describe('required-parameter validation', () => {
	test('a Record Get with no record id is flagged as incomplete', async ({ seed, page }) => {
		const node = await seed({
			name: 'missing record id',
			parameters: { resource: 'record', operation: 'get', object: 'people', recordId: '' },
		});

		await page.goto(`/workflow/${node.workflowId}`);

		await expect(page.getByTestId('node-issues').first()).toBeVisible();
	});

	test('a fully configured node is not flagged', async ({ seed, page }) => {
		const node = await seed({
			name: 'complete record get',
			parameters: {
				resource: 'record',
				operation: 'get',
				object: 'people',
				recordId: '00000000-0000-0000-0000-000000000000',
			},
		});

		await page.goto(`/workflow/${node.workflowId}`);
		await expect(page.getByTestId('canvas')).toBeVisible();

		await expect(page.getByTestId('node-issues')).toHaveCount(0);
	});
});
