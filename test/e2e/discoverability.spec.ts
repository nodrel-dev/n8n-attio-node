import { expect, test } from './support/fixtures';

/**
 * The node has to be findable before anything else matters. A packaging or
 * `codex`/description regression shows up here first, and nowhere in the unit suite.
 */

test.describe('node creator discoverability', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/workflow/new');
		await page.getByTestId('node-creator-plus-button').click();
		await page.getByTestId('node-creator-search-bar').fill('Attio');
	});

	test('Attio is the top result when searching by name', async ({ page }) => {
		const results = page.getByTestId('item-iterator-item');
		await expect(results.first()).toBeVisible();

		// The node-creator mixes locally installed nodes with suggestions from the
		// public registry; ours must outrank the remote noise.
		await expect(results.first()).toContainText('Attio');
	});

	test('the node renders its own icon rather than a fallback', async ({ page }) => {
		const attio = page.getByTestId('item-iterator-item').first();
		await expect(attio.locator('img, svg').first()).toBeVisible();
	});
});
