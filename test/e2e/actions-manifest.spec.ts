import { expect, test } from './support/fixtures';

/**
 * The actions panel is generated from the node's operation descriptions, so it is
 * the one place the whole 18-operation surface is visible at once. The counts here
 * are the documented 9 Record / 4 Note / 5 Task split — if an operation is added,
 * renamed or dropped, this spec is the tripwire.
 */

const RECORD_ACTIONS = [
	'Create a record',
	'Create or update a record',
	'Delete a record',
	'Get a record',
	'Get many records',
	'List historical values for a record attribute',
	'List list entries for a record',
	'Search records across objects',
	'Update a record',
];

const NOTE_ACTIONS = ['Create a note', 'Delete a note', 'Get a note', 'Get many notes'];

const TASK_ACTIONS = [
	'Create a task',
	'Delete a task',
	'Get a task',
	'Get many tasks',
	'Update a task',
];

test.describe('actions manifest', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/workflow/new');
		await page.getByTestId('node-creator-plus-button').click();
		await page.getByTestId('node-creator-search-bar').fill('Attio');
		await page.getByTestId('item-iterator-item').first().click();
		await expect(page.getByText('RECORD ACTIONS')).toBeVisible();
	});

	test('exposes exactly 18 actions', async ({ page }) => {
		await expect(page.getByText(/^Actions \(\d+\)$/)).toHaveText('Actions (18)');
	});

	test('groups actions under Record, Note and Task headings', async ({ page }) => {
		for (const heading of ['RECORD ACTIONS', 'NOTE ACTIONS', 'TASK ACTIONS']) {
			await expect(page.getByText(heading)).toBeVisible();
		}
	});

	test('lists every documented operation with its readable name', async ({ page }) => {
		const listed = await page.getByTestId('item-iterator-item').allInnerTexts();
		const names = listed.map((t) => t.split('\n')[0].trim());

		for (const action of [...RECORD_ACTIONS, ...NOTE_ACTIONS, ...TASK_ACTIONS]) {
			expect(names, `"${action}" missing from the actions panel`).toContain(action);
		}
	});

	test('offers the custom API call escape hatch', async ({ page }) => {
		await expect(page.getByText(/Make a custom Attio API call/i)).toBeVisible();
	});
});
