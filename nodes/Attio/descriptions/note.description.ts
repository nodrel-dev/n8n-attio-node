import type { INodeProperties } from 'n8n-workflow';

import {
	makeAttioErrorPostReceive,
	makeDeleteSuccess,
	makeNoteBodyPreSend,
	makeNoteListPreSend,
	unwrapData,
} from './shared';

/** Scopes per note-operations contract (research.md R2): a 403 names these. */
const NOTE_WRITE_SCOPES = ['note:read-write', 'object_configuration:read', 'record_permission:read'];
const NOTE_READ_SCOPES = ['note:read', 'object_configuration:read', 'record_permission:read'];
const NOTE_DELETE_SCOPES = ['note:read-write'];

/**
 * Note resource — Operation selector + per-operation params/routing (4-op matrix).
 * Create links a note to a parent record (`POST /v2/notes`); Get/Get Many/Delete operate on
 * `/v2/notes/{note_id}`. Each option carries a readable name + `action` for AI-tool use.
 */
export const noteDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['note'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a note',
				routing: {
					request: { method: 'POST', url: '/v2/notes' },
					send: { preSend: [makeNoteBodyPreSend()] },
					output: { postReceive: [makeAttioErrorPostReceive(NOTE_WRITE_SCOPES), unwrapData] },
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a note',
				routing: {
					request: { method: 'DELETE', url: '=/v2/notes/{{$parameter.noteId}}' },
					output: {
						postReceive: [
							makeAttioErrorPostReceive(NOTE_DELETE_SCOPES),
							makeDeleteSuccess('note_id', 'noteId'),
						],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a note',
				routing: {
					request: { method: 'GET', url: '=/v2/notes/{{$parameter.noteId}}' },
					output: { postReceive: [makeAttioErrorPostReceive(NOTE_READ_SCOPES), unwrapData] },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many notes',
				// Optional parent filters in the query string; Return All loops `offset` in the query
				// string (gated by the Return All param) until a short page.
				routing: {
					request: { method: 'GET', url: '/v2/notes' },
					send: {
						preSend: [makeNoteListPreSend()],
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
					output: { postReceive: [makeAttioErrorPostReceive(NOTE_READ_SCOPES), unwrapData] },
				},
			},
		],
		default: 'create',
	},

	// ---- Create ----
	{
		displayName: 'Parent Object Name or ID',
		name: 'parentObject',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getObjects' },
		required: true,
		default: '',
		description:
			'The object of the record this note is attached to, e.g. People or Companies. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { resource: ['note'], operation: ['create'] } },
	},
	{
		displayName: 'Parent Record ID',
		name: 'parentRecordId',
		type: 'string',
		required: true,
		default: '',
		description: 'The `record_id` of the record this note is attached to',
		displayOptions: { show: { resource: ['note'], operation: ['create'] } },
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		description: 'The note title',
		displayOptions: { show: { resource: ['note'], operation: ['create'] } },
	},
	{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		default: 'plaintext',
		description: 'How the note content is interpreted',
		options: [
			{ name: 'Plaintext', value: 'plaintext' },
			{ name: 'Markdown', value: 'markdown' },
		],
		displayOptions: { show: { resource: ['note'], operation: ['create'] } },
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		description: 'The note body, interpreted according to the selected Format',
		displayOptions: { show: { resource: ['note'], operation: ['create'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['note'], operation: ['create'] } },
		options: [
			{
				displayName: 'Created At',
				name: 'createdAt',
				type: 'dateTime',
				default: '',
				description: 'Backdate the note to this time (ISO 8601). Defaults to now.',
			},
			{
				displayName: 'Meeting ID',
				name: 'meetingId',
				type: 'string',
				default: '',
				description: 'Associate the note with an Attio meeting',
			},
		],
	},

	// ---- Get / Delete ----
	{
		displayName: 'Note ID',
		name: 'noteId',
		type: 'string',
		required: true,
		default: '',
		description: 'The `note_id` of the note',
		displayOptions: { show: { resource: ['note'], operation: ['get', 'delete'] } },
	},

	// ---- Get Many ----
	{
		displayName: 'Parent Object Name or ID',
		name: 'parentObjectFilter',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getObjects' },
		default: '',
		description:
			'Only return notes attached to records of this object. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { resource: ['note'], operation: ['getAll'] } },
	},
	{
		displayName: 'Parent Record ID',
		name: 'parentRecordIdFilter',
		type: 'string',
		default: '',
		description: 'Only return notes attached to this record ID',
		displayOptions: { show: { resource: ['note'], operation: ['getAll'] } },
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: ['note'], operation: ['getAll'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { resource: ['note'], operation: ['getAll'], returnAll: [false] } },
	},
];
