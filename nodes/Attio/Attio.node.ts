import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { recordDescription } from './descriptions/record.description';
import { noteDescription } from './descriptions/note.description';
import { taskDescription } from './descriptions/task.description';

/**
 * Attio — declarative-style n8n action node (Principle II).
 *
 * Skeleton (Phase 2): Resource selector (Record / Note / Task) + per-resource Operation
 * selectors. Objects are deliberately NOT a user-facing resource (FR-015) — they only power
 * the dynamic Object dropdown via the `getObjects` loadOptions method (added in US1).
 *
 * Shared response handling lives in `descriptions/shared.ts`: `ignoreHttpStatusErrors` routes
 * non-2xx responses into a `formatAttioError`-backed postReceive; success responses unwrap the
 * top-level `data` key. The only programmatic surface is `getObjects` (not a runtime dependency).
 */
export class Attio implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Attio',
		name: 'attio',
		icon: 'file:attio.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with Attio CRM records, notes, and tasks',
		defaults: {
			name: 'Attio',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		// The `attioApi` credential (and `credentials: [...]` here) is wired in US1 (T023),
		// together with its `/v2/self` test. Declaring it before the credential file exists
		// would fail the community-node credential-reuse lint, so it is deferred.
		requestDefaults: {
			baseURL: 'https://api.attio.com',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			// Route non-2xx responses through the shared formatAttioError postReceive
			// instead of n8n's default error (Principle IX, FR-9).
			ignoreHttpStatusErrors: true,
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Record', value: 'record' },
					{ name: 'Note', value: 'note' },
					{ name: 'Task', value: 'task' },
				],
				default: 'record',
			},
			...recordDescription,
			...noteDescription,
			...taskDescription,
		],
	};
}
