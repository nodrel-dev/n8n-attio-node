import type { INodeProperties } from 'n8n-workflow';

import {
	makeAttioErrorPostReceive,
	makeDeleteSuccess,
	makeTaskCreateBodyPreSend,
	makeTaskListPreSend,
	makeTaskUpdateBodyPreSend,
	unwrapData,
} from './shared';

/** Scopes per task-operations contract (research.md R2): a 403 names these. */
const TASK_WRITE_SCOPES = [
	'task:read-write',
	'object_configuration:read',
	'record_permission:read',
	'user_management:read',
];
const TASK_READ_SCOPES = [
	'task:read',
	'object_configuration:read',
	'record_permission:read',
	'user_management:read',
];
const TASK_DELETE_SCOPES = ['task:read-write'];

/**
 * Task resource — Operation selector + per-operation params/routing (5-op matrix).
 * Task content is write-once (Principle VI/FR-14): the Update surface intentionally omits a
 * Content field. `format` is always plaintext (no selector). Linked Records and Assignees are
 * shared between Create and Update; Update's deadline/completion live in an Update Fields collection.
 */
export const taskDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['task'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a task',
				routing: {
					request: { method: 'POST', url: '/v2/tasks' },
					send: { preSend: [makeTaskCreateBodyPreSend()] },
					output: { postReceive: [makeAttioErrorPostReceive(TASK_WRITE_SCOPES), unwrapData] },
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a task',
				routing: {
					request: { method: 'DELETE', url: '=/v2/tasks/{{encodeURIComponent($parameter.taskId)}}' },
					output: {
						postReceive: [
							makeAttioErrorPostReceive(TASK_DELETE_SCOPES),
							makeDeleteSuccess('task_id', 'taskId'),
						],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a task',
				routing: {
					request: { method: 'GET', url: '=/v2/tasks/{{encodeURIComponent($parameter.taskId)}}' },
					output: { postReceive: [makeAttioErrorPostReceive(TASK_READ_SCOPES), unwrapData] },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many tasks',
				// Optional filters in the query string; Return All loops `offset` in the query string.
				routing: {
					request: { method: 'GET', url: '/v2/tasks' },
					send: {
						preSend: [makeTaskListPreSend()],
						paginate: '={{ $parameter.returnAll }}',
					},
					operations: {
						pagination: {
							type: 'offset',
							properties: {
								limitParameter: 'limit',
								offsetParameter: 'offset',
								pageSize: 50,
								type: 'query',
								rootProperty: 'data',
							},
						},
					},
					output: { postReceive: [makeAttioErrorPostReceive(TASK_READ_SCOPES), unwrapData] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a task',
				// No Content field — task content is write-once (Principle VI/FR-14).
				routing: {
					request: { method: 'PATCH', url: '=/v2/tasks/{{encodeURIComponent($parameter.taskId)}}' },
					send: { preSend: [makeTaskUpdateBodyPreSend()] },
					output: { postReceive: [makeAttioErrorPostReceive(TASK_WRITE_SCOPES), unwrapData] },
				},
			},
		],
		default: 'create',
	},

	// ---- Get / Update / Delete ----
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		default: '',
		description: 'The `task_id` of the task',
		displayOptions: { show: { resource: ['task'], operation: ['get', 'update', 'delete'] } },
	},

	// ---- Create ----
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		description:
			'The task content (plaintext). Set at creation only — task content cannot be changed later.',
		displayOptions: { show: { resource: ['task'], operation: ['create'] } },
	},
	{
		displayName: 'Deadline At',
		name: 'deadlineAt',
		type: 'dateTime',
		default: '',
		description: 'When the task is due (ISO 8601). Leave empty for no deadline.',
		displayOptions: { show: { resource: ['task'], operation: ['create'] } },
	},
	{
		displayName: 'Is Completed',
		name: 'isCompleted',
		type: 'boolean',
		default: false,
		description: 'Whether the task is already completed',
		displayOptions: { show: { resource: ['task'], operation: ['create'] } },
	},

	// ---- Update Fields (partial PATCH; no Content) ----
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description: 'Fields to change. Task content cannot be updated and is not listed here.',
		displayOptions: { show: { resource: ['task'], operation: ['update'] } },
		options: [
			{
				displayName: 'Deadline At',
				name: 'deadlineAt',
				type: 'dateTime',
				default: '',
				description: 'When the task is due (ISO 8601). Clear to remove the deadline.',
			},
			{
				displayName: 'Is Completed',
				name: 'isCompleted',
				type: 'boolean',
				default: false,
				description: 'Whether the task is completed',
			},
		],
	},

	// ---- Linked Records (Create + Update) ----
	{
		displayName: 'Linked Records',
		name: 'linkedRecords',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		description: 'Records this task is linked to. Referenced records must already exist.',
		placeholder: 'Add Linked Record',
		displayOptions: { show: { resource: ['task'], operation: ['create', 'update'] } },
		options: [
			{
				name: 'record',
				displayName: 'Record',
				values: [
					{
						displayName: 'Object Name or ID',
						name: 'object',
						type: 'options',
						typeOptions: { loadOptionsMethod: 'getObjects' },
						default: '',
						description:
							'The object of the linked record. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Record ID',
						name: 'recordId',
						type: 'string',
						default: '',
						description: 'The `record_id` of the linked record',
					},
				],
			},
		],
	},

	// ---- Assignees (Create + Update) ----
	{
		displayName: 'Assignees',
		name: 'assignees',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		description:
			'Workspace members to assign. Provide an email (resolved server-side) or, for advanced use, a workspace member ID.',
		placeholder: 'Add Assignee',
		displayOptions: { show: { resource: ['task'], operation: ['create', 'update'] } },
		options: [
			{
				name: 'assignee',
				displayName: 'Assignee',
				values: [
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@email.com',
						default: '',
						description: 'The workspace member email to assign (takes precedence over a member ID)',
					},
					{
						displayName: 'Workspace Member ID',
						name: 'referencedActorId',
						type: 'string',
						default: '',
						description: 'Advanced: assign by workspace member ID instead of email',
					},
				],
			},
		],
	},

	// ---- Get Many ----
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['task'], operation: ['getAll'] } },
		options: [
			{
				displayName: 'Assignee',
				name: 'assignee',
				type: 'string',
				default: '',
				description: 'Only return tasks assigned to this workspace member (email or member ID)',
			},
			{
				displayName: 'Is Completed',
				name: 'isCompleted',
				type: 'boolean',
				default: false,
				description: 'Whether to return only completed (or only open) tasks',
			},
			{
				displayName: 'Linked Object Name or ID',
				name: 'linkedObject',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getObjects' },
				default: '',
				description:
					'Only return tasks linked to records of this object. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Linked Record ID',
				name: 'linkedRecordId',
				type: 'string',
				default: '',
				description: 'Only return tasks linked to this record ID',
			},
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: ['task'], operation: ['getAll'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { resource: ['task'], operation: ['getAll'], returnAll: [false] } },
	},
];
