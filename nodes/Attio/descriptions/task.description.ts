import type { INodeProperties } from 'n8n-workflow';

/**
 * Task resource — Operation selector skeleton (5-op matrix).
 * Per-operation parameters and `routing` are added in US6 (Tasks). Task content is write-once:
 * the Update surface (added later) intentionally omits a Content field (Principle VI).
 */
export const taskDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['task'] } },
		options: [
			{ name: 'Create', value: 'create', action: 'Create a task' },
			{ name: 'Delete', value: 'delete', action: 'Delete a task' },
			{ name: 'Get', value: 'get', action: 'Get a task' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many tasks' },
			{ name: 'Update', value: 'update', action: 'Update a task' },
		],
		default: 'create',
	},
];
