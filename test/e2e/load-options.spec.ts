import { expect, test } from './support/fixtures';

/**
 * `loadOptions` only ever runs in the editor: it is the UI asking the node to call
 * Attio and populate a dropdown. Driving the node through n8n's REST API skips it
 * entirely, so these dropdowns had no coverage at all before this suite.
 *
 * Each test here makes a real request to the Attio API using the full-scope credential.
 */

test.describe('dynamic option loading', () => {
	test('the Object dropdown is populated from the live workspace', async ({ seed, ndv }) => {
		const node = await seed({
			name: 'loadOptions objects',
			parameters: { resource: 'record', operation: 'create' },
		});
		await ndv.open(node.ndvPath);

		const options = await ndv.openDropdown('object');

		// Every Attio workspace ships these two standard objects.
		expect(options).toContain('People');
		expect(options).toContain('Companies');
	});

	test('Attribute is a free-text slug field, not a loaded dropdown', async ({ seed, ndv }) => {
		// Documents current behaviour: `attribute` is declared `type: 'string'`, so
		// the user types a slug ("name", "domains") rather than picking from the
		// workspace's attributes. Object is a dropdown but Attribute is not; if that
		// is ever made dynamic, this test should be replaced with a dropdown assertion.
		const node = await seed({
			name: 'attribute is free text',
			parameters: {
				resource: 'record',
				operation: 'listAttributeValues',
				object: 'people',
			},
		});
		await ndv.open(node.ndvPath);

		expect(await ndv.visibleParameterNames()).toContain('attribute');
		await expect(ndv.parameter('attribute').locator('.el-select')).toHaveCount(0);
	});

	test('a stored raw value is resolved to its human-readable label', async ({ seed, ndv }) => {
		// The node stores the slug `people`; the editor should display "People",
		// which only happens if loadOptions resolved successfully.
		const node = await seed({
			name: 'loadOptions label resolution',
			parameters: { resource: 'record', operation: 'get', object: 'people', recordId: 'x' },
		});
		await ndv.open(node.ndvPath);

		await expect
			.poll(async () => ndv.parameterValue('object'), { timeout: 20_000 })
			.toBe('People');
	});

	test('the Search operation can target multiple objects at once', async ({ seed, ndv }) => {
		const node = await seed({
			name: 'loadOptions search objects',
			parameters: { resource: 'record', operation: 'search', query: 'probe' },
		});
		await ndv.open(node.ndvPath);

		const options = await ndv.openDropdown('searchObjects');

		expect(options).toContain('People');
	});
});
