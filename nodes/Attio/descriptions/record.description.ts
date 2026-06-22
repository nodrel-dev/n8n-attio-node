import type { INodeProperties } from 'n8n-workflow';

/**
 * Record resource — Operation selector skeleton (10-op matrix, FR-003).
 * Per-operation parameters and `routing` are added in their own phases (US2/US3/US4/US5,
 * Record completion). Each entry already carries readable name + `action` for AI-tool use.
 */
export const recordDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['record'] } },
		options: [
			{ name: 'Create', value: 'create', action: 'Create a record' },
			{ name: 'Create or Update', value: 'upsert', action: 'Create or update a record' },
			{ name: 'Delete', value: 'delete', action: 'Delete a record' },
			{ name: 'Get', value: 'get', action: 'Get a record' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many records' },
			{
				name: 'List Attribute Values',
				value: 'listAttributeValues',
				action: 'List historical values for a record attribute',
			},
			{ name: 'List Entries', value: 'listEntries', action: 'List list entries for a record' },
			{ name: 'Search', value: 'search', action: 'Search records across objects' },
			{ name: 'Update', value: 'update', action: 'Update a record' },
		],
		default: 'create',
	},
];
