import { readFileSync } from 'node:fs';

import { test as base } from '@playwright/test';

import { CREDENTIALS_FILE, type SeedCredentials } from '../global-setup';
import { deleteWorkflow, seedAttioNode, type SeededNode } from './n8n-client';
import { Ndv } from './ndv';

/**
 * Shared fixtures: the credentials provisioned in global setup, an NDV page
 * object, and a seeding helper that cleans up every workflow it creates.
 */

interface Fixtures {
	credentials: SeedCredentials;
	ndv: Ndv;
	/** Seeds an Attio node and returns its deep-link; torn down after the test. */
	seed: (options: {
		name: string;
		parameters: Record<string, unknown>;
		restricted?: boolean;
	}) => Promise<SeededNode>;
}

export const test = base.extend<Fixtures>({
	credentials: async ({}, use) => {
		await use(JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf8')) as SeedCredentials);
	},

	ndv: async ({ page }, use) => {
		await use(new Ndv(page));
	},

	seed: async ({ request, credentials }, use) => {
		const created: string[] = [];

		await use(async ({ name, parameters, restricted = false }) => {
			const node = await seedAttioNode(request, {
				name: `[e2e] ${name}`,
				parameters,
				credentialId: restricted ? credentials.restrictedId : credentials.fullId,
				credentialName: restricted ? credentials.restrictedName : credentials.fullName,
			});
			created.push(node.workflowId);
			return node;
		});

		for (const id of created) await deleteWorkflow(request, id);
	},
});

export { expect } from '@playwright/test';
