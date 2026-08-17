import { expect, test } from './support/fixtures';

/**
 * `displayOptions` decides which parameters appear for a given resource/operation
 * pair. It is pure editor behaviour — the REST API accepts whatever body it is
 * handed — so a wrong `displayOptions` rule ships silently and only bites a user
 * building a workflow by hand.
 *
 * Assertions read parameter *names* off their test ids rather than label text, so
 * they survive copy changes.
 */

interface Case {
	title: string;
	parameters: Record<string, unknown>;
	shows: string[];
	hides: string[];
}

const CASES: Case[] = [
	{
		title: 'Record: Create asks for values, not a record id',
		parameters: { resource: 'record', operation: 'create', object: 'people' },
		shows: ['object', 'values'],
		hides: ['recordId', 'matchingAttribute'],
	},
	{
		title: 'Record: Get asks for a record id, not values',
		parameters: { resource: 'record', operation: 'get', object: 'people', recordId: 'x' },
		shows: ['object', 'recordId'],
		hides: ['values', 'multiselectMode'],
	},
	{
		title: 'Record: Create or Update exposes the matching attribute',
		parameters: { resource: 'record', operation: 'upsert', object: 'people' },
		shows: ['object', 'matchingAttribute', 'values'],
		hides: ['recordId'],
	},
	{
		title: 'Record: Update exposes the append/overwrite selector',
		parameters: { resource: 'record', operation: 'update', object: 'people', recordId: 'x' },
		shows: ['object', 'recordId', 'multiselectMode', 'values'],
		hides: ['matchingAttribute'],
	},
	{
		title: 'Record: Search targets objects instead of one object',
		parameters: { resource: 'record', operation: 'search', query: 'probe' },
		shows: ['query', 'searchObjects'],
		hides: ['recordId', 'values'],
	},
	{
		title: 'Note: Create asks for parent, title, format and content',
		parameters: { resource: 'note', operation: 'create' },
		shows: ['parentObject', 'parentRecordId', 'title', 'format', 'content'],
		hides: ['noteId'],
	},
	{
		title: 'Note: Get asks only for the note id',
		parameters: { resource: 'note', operation: 'get', noteId: 'x' },
		shows: ['noteId'],
		hides: ['title', 'content', 'parentObject'],
	},
	{
		title: 'Task: Create asks for content, deadline and links',
		parameters: { resource: 'task', operation: 'create' },
		shows: ['content', 'deadlineAt', 'isCompleted', 'linkedRecords'],
		hides: ['taskId'],
	},
];

test.describe('conditional parameter rendering', () => {
	for (const testCase of CASES) {
		test(testCase.title, async ({ seed, ndv }) => {
			const node = await seed({ name: testCase.title, parameters: testCase.parameters });
			await ndv.open(node.ndvPath);

			const visible = await ndv.visibleParameterNames();

			for (const name of testCase.shows) {
				expect(visible, `expected "${name}" to be shown`).toContain(name);
			}
			for (const name of testCase.hides) {
				expect(visible, `expected "${name}" to be hidden`).not.toContain(name);
			}
		});
	}

	test('Task: Update never offers content, which Attio treats as write-once', async ({
		seed,
		ndv,
	}) => {
		// FR-14: task content cannot be changed after creation, so the editor must
		// not offer a field that would silently do nothing.
		const node = await seed({
			name: 'task update hides content',
			parameters: { resource: 'task', operation: 'update', taskId: 'x' },
		});
		await ndv.open(node.ndvPath);

		const visible = await ndv.visibleParameterNames();
		expect(visible).toContain('taskId');
		expect(visible).not.toContain('content');

		// `updateFields` is a `collection`, which n8n renders without a name-bearing
		// test id, so it is asserted by its label.
		expect(await ndv.visibleParameterLabels()).toContain('Update Fields');
	});

	test('switching operation in the editor re-renders the parameter set', async ({ seed, ndv }) => {
		// The cases above seed each state directly; this one proves the panel reacts
		// to a change made in the UI, which is how a user actually reaches these states.
		const node = await seed({
			name: 'operation switch reactivity',
			parameters: { resource: 'record', operation: 'create', object: 'people' },
		});
		await ndv.open(node.ndvPath);

		expect(await ndv.visibleParameterNames()).toContain('values');

		await ndv.selectOption('operation', 'Get');

		await expect
			.poll(async () => ndv.visibleParameterNames())
			.toEqual(expect.arrayContaining(['recordId']));
		expect(await ndv.visibleParameterNames()).not.toContain('values');
	});
});
