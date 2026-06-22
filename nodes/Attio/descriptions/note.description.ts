import type { INodeProperties } from 'n8n-workflow';

/**
 * Note resource — Operation selector skeleton (4-op matrix).
 * Per-operation parameters and `routing` are added in US6 (Notes).
 */
export const noteDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['note'] } },
		options: [
			{ name: 'Create', value: 'create', action: 'Create a note' },
			{ name: 'Delete', value: 'delete', action: 'Delete a note' },
			{ name: 'Get', value: 'get', action: 'Get a note' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many notes' },
		],
		default: 'create',
	},
];
