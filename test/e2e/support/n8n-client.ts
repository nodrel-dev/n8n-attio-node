import type { APIRequestContext } from '@playwright/test';

/**
 * Thin wrapper over n8n's internal `/rest` API.
 *
 * Specs seed workflows through this client and then deep-link to the node's NDV
 * (`/workflow/{workflowId}/{nodeId}`), rather than dragging nodes onto the canvas.
 * Canvas interaction is the most brittle part of n8n's UI and testing it would tell
 * us about n8n, not about this node.
 */

export const OWNER = {
	email: 'verify@local.test',
	firstName: 'Verify',
	lastName: 'Harness',
	password: 'AttioVerify1',
} as const;

export interface SeededNode {
	readonly workflowId: string;
	readonly nodeId: string;
	/** Path to deep-link straight into this node's NDV. */
	readonly ndvPath: string;
}

/** Creates the instance owner, or signs in when one already exists. */
export async function ensureSignedIn(request: APIRequestContext): Promise<void> {
	const settings = await request.get('/rest/settings');
	const body = await settings.json();

	if (body.data?.userManagement?.showSetupOnFirstLoad) {
		const created = await request.post('/rest/owner/setup', { data: OWNER });
		if (!created.ok()) {
			throw new Error(`Owner setup failed (${created.status()}): ${await created.text()}`);
		}
		return;
	}

	const login = await request.post('/rest/login', {
		data: { emailOrLdapLoginId: OWNER.email, password: OWNER.password },
	});
	if (!login.ok()) {
		throw new Error(
			`Sign-in failed (${login.status()}). The n8n volume may hold a different owner — ` +
				`recreate it with a clean volume. Body: ${await login.text()}`,
		);
	}
}

/** Returns the id of an existing credential with this name, else creates one. */
export async function ensureCredential(
	request: APIRequestContext,
	name: string,
	apiToken: string,
): Promise<string> {
	const existing = await request.get('/rest/credentials');
	if (existing.ok()) {
		const found = (await existing.json()).data?.find(
			(c: { name: string; id: string }) => c.name === name,
		);
		if (found) return found.id;
	}

	const created = await request.post('/rest/credentials', {
		data: { name, type: 'attioApi', data: { apiToken } },
	});
	if (!created.ok()) {
		throw new Error(`Credential "${name}" failed (${created.status()}): ${await created.text()}`);
	}
	return (await created.json()).data.id;
}

/**
 * Creates a manual-trigger -> Attio workflow and returns the deep-link to the
 * Attio node's NDV. `parameters` is passed through verbatim so a spec can seed
 * any resource/operation combination, including deliberately invalid ones.
 */
export async function seedAttioNode(
	request: APIRequestContext,
	options: {
		name: string;
		parameters: Record<string, unknown>;
		credentialId: string;
		credentialName: string;
	},
): Promise<SeededNode> {
	const nodeId = 'attio-under-test';

	const response = await request.post('/rest/workflows', {
		data: {
			name: options.name,
			nodes: [
				{
					parameters: {},
					id: 'trigger',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
				},
				{
					parameters: options.parameters,
					id: nodeId,
					name: 'Attio',
					type: 'CUSTOM.attio',
					typeVersion: 1,
					position: [220, 0],
					credentials: {
						attioApi: { id: options.credentialId, name: options.credentialName },
					},
				},
			],
			connections: { Start: { main: [[{ node: 'Attio', type: 'main', index: 0 }]] } },
			settings: {},
		},
	});

	if (!response.ok()) {
		throw new Error(`Workflow seed failed (${response.status()}): ${await response.text()}`);
	}

	const workflowId = (await response.json()).data.id;
	return { workflowId, nodeId, ndvPath: `/workflow/${workflowId}/${nodeId}` };
}

/**
 * Removes a seeded workflow.
 *
 * n8n 2.x refuses to delete a workflow that is not archived first
 * (`400 Workflow must be archived before it can be deleted`), so this archives and
 * then deletes. Both statuses are checked: a teardown that fails quietly just
 * accumulates workflows until an unrelated spec trips over the clutter.
 */
export async function deleteWorkflow(
	request: APIRequestContext,
	workflowId: string,
): Promise<void> {
	const archived = await request.post(`/rest/workflows/${workflowId}/archive`);
	if (!archived.ok()) {
		throw new Error(
			`Archiving workflow ${workflowId} failed (${archived.status()}): ${await archived.text()}`,
		);
	}

	const deleted = await request.delete(`/rest/workflows/${workflowId}`);
	if (!deleted.ok()) {
		throw new Error(
			`Deleting workflow ${workflowId} failed (${deleted.status()}): ${await deleted.text()}`,
		);
	}
}
