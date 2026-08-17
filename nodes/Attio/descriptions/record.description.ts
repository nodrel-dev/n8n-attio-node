import type { INodeProperties } from 'n8n-workflow';

import {
	makeAttioErrorPostReceive,
	makeDeleteSuccess,
	makeMatchingAttributePreSend,
	makeQueryBodyPreSend,
	makeSearchBodyPreSend,
	makeValuesBodyPreSend,
	unwrapData,
} from './shared';
import { updateVerb } from '../core/updateVerb';

/** Scopes per record-operations contract (research.md R2): a 403 names these. */
const RECORD_WRITE_SCOPES = ['record_permission:read-write', 'object_configuration:read'];
const RECORD_READ_SCOPES = ['record_permission:read', 'object_configuration:read'];
/** List Entries also needs `list_entry:read` (research.md R2, contract §9). */
const RECORD_LIST_ENTRY_SCOPES = ['record_permission:read', 'object_configuration:read', 'list_entry:read'];

/**
 * Record resource — Operation selector + per-operation params/routing.
 * US2 wires Create (`POST .../records`) and Get (`GET .../records/{id}`); the remaining
 * operations (Upsert/Update/Get Many/Search/Delete/…) are added in their own phases.
 * Each option carries a readable name + `action` for AI-tool use.
 */
export const recordDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['record'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a record',
				routing: {
					request: {
						method: 'POST',
						url: '=/v2/objects/{{$parameter.object}}/records',
					},
					send: { preSend: [makeValuesBodyPreSend()] },
					output: { postReceive: [makeAttioErrorPostReceive(RECORD_WRITE_SCOPES), unwrapData] },
				},
			},
			{
				name: 'Create or Update',
				value: 'upsert',
				action: 'Create or update a record',
				// Collection-level PUT (no record_id) with a required matching_attribute query param.
				routing: {
					request: {
						method: 'PUT',
						url: '=/v2/objects/{{$parameter.object}}/records',
					},
					send: { preSend: [makeMatchingAttributePreSend(), makeValuesBodyPreSend()] },
					output: { postReceive: [makeAttioErrorPostReceive(RECORD_WRITE_SCOPES), unwrapData] },
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a record',
				// Attio returns an empty body on success; synthesise a clear success indicator.
				routing: {
					request: {
						method: 'DELETE',
						url: '=/v2/objects/{{$parameter.object}}/records/{{$parameter.recordId}}',
					},
					output: {
						postReceive: [
							makeAttioErrorPostReceive(RECORD_WRITE_SCOPES),
							makeDeleteSuccess('record_id', 'recordId'),
						],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a record',
				routing: {
					request: {
						method: 'GET',
						url: '=/v2/objects/{{$parameter.object}}/records/{{$parameter.recordId}}',
					},
					output: { postReceive: [makeAttioErrorPostReceive(RECORD_READ_SCOPES), unwrapData] },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many records',
				// Filtered/sorted listing. Return All loops `offset` in the request **body** via n8n's
				// offset pagination (gated by the Return All param); a single page otherwise.
				routing: {
					request: {
						method: 'POST',
						url: '=/v2/objects/{{$parameter.object}}/records/query',
					},
					send: {
						preSend: [makeQueryBodyPreSend()],
						paginate: '={{ $parameter.returnAll }}',
					},
					operations: {
						pagination: {
							type: 'offset',
							properties: {
								limitParameter: 'limit',
								offsetParameter: 'offset',
								pageSize: 100,
								type: 'body',
								rootProperty: 'data',
							},
						},
					},
					output: { postReceive: [makeAttioErrorPostReceive(RECORD_READ_SCOPES), unwrapData] },
				},
			},
			{
				name: 'List Attribute Values',
				value: 'listAttributeValues',
				action: 'List historical values for a record attribute',
				routing: {
					request: {
						method: 'GET',
						url: '=/v2/objects/{{$parameter.object}}/records/{{$parameter.recordId}}/attributes/{{$parameter.attribute}}/values',
					},
					output: { postReceive: [makeAttioErrorPostReceive(RECORD_READ_SCOPES), unwrapData] },
				},
			},
			{
				name: 'List Entries',
				value: 'listEntries',
				action: 'List list entries for a record',
				routing: {
					request: {
						method: 'GET',
						url: '=/v2/objects/{{$parameter.object}}/records/{{$parameter.recordId}}/entries',
					},
					output: { postReceive: [makeAttioErrorPostReceive(RECORD_LIST_ENTRY_SCOPES), unwrapData] },
				},
			},
			{
				name: 'Search',
				value: 'search',
				action: 'Search records across objects',
				// Cross-object free-text search; no single {object} in the path (research.md R3).
				routing: {
					request: {
						method: 'POST',
						url: '=/v2/objects/records/search',
					},
					send: { preSend: [makeSearchBodyPreSend()] },
					output: { postReceive: [makeAttioErrorPostReceive(RECORD_READ_SCOPES), unwrapData] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a record',
				// HTTP method is supplied per-option by the Multiselect Mode param (Append→PATCH,
				// Overwrite→PUT, research.md R1); only the url/body/response are set here.
				routing: {
					request: {
						url: '=/v2/objects/{{$parameter.object}}/records/{{$parameter.recordId}}',
					},
					send: { preSend: [makeValuesBodyPreSend()] },
					output: { postReceive: [makeAttioErrorPostReceive(RECORD_WRITE_SCOPES), unwrapData] },
				},
			},
		],
		default: 'create',
	},
	{
		displayName: 'Object Name or ID',
		name: 'object',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getObjects' },
		required: true,
		default: '',
		description:
			'The Attio object to operate on (e.g. People, Companies, Deals, or a custom object). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		// Object is the path segment for every per-object Record endpoint. Search is the lone
		// Record op that is cross-object (no single {object} in the path), so it is excluded here
		// and gets its own multiOptions Objects param in US5.
		displayOptions: { show: { resource: ['record'], operation: ['create', 'upsert', 'get', 'update', 'getAll', 'delete', 'listAttributeValues', 'listEntries'] } },
	},
	{
		displayName: 'Record ID',
		name: 'recordId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the record (the `record_id` UUID returned by Attio)',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['get', 'update', 'delete', 'listAttributeValues', 'listEntries'],
			},
		},
	},
	{
		displayName: 'Attribute',
		name: 'attribute',
		type: 'string',
		required: true,
		default: '',
		description: 'The attribute slug whose historical values to list (e.g. "name" or "domains")',
		displayOptions: { show: { resource: ['record'], operation: ['listAttributeValues'] } },
	},
	{
		displayName: 'Multiselect Mode',
		name: 'multiselectMode',
		type: 'options',
		default: 'append',
		description:
			'How multiselect (and other list) attributes are written: Append keeps existing values and adds the new ones (PATCH); Overwrite replaces the set so it equals exactly what you send (PUT)',
		// Per-option routing supplies the HTTP method; the verbs come from the tested `updateVerb`
		// pure function so the mapping has a single source of truth.
		options: [
			{
				name: 'Append',
				value: 'append',
				action: 'Append to multiselect attributes',
				routing: { request: { method: updateVerb('append') } },
			},
			{
				name: 'Overwrite',
				value: 'overwrite',
				action: 'Overwrite multiselect attributes',
				routing: { request: { method: updateVerb('overwrite') } },
			},
		],
		displayOptions: { show: { resource: ['record'], operation: ['update'] } },
	},
	{
		displayName: 'Matching Attribute',
		name: 'matchingAttribute',
		type: 'string',
		required: true,
		default: '',
		description:
			'The attribute slug Attio matches on to decide create vs update (e.g. "domains" or a unique custom attribute). Referenced records must already exist; Attio does not auto-create them.',
		displayOptions: { show: { resource: ['record'], operation: ['upsert'] } },
	},
	{
		displayName: 'Values',
		name: 'values',
		type: 'json',
		default: '{}',
		description:
			'Attribute values as a JSON object of attribute slugs to values, e.g. {"name": "Acme", "domains": ["acme.com"]}. Sent to Attio as { data: { values } }.',
		displayOptions: { show: { resource: ['record'], operation: ['create', 'update', 'upsert'] } },
	},

	// ---- Get Many (records/query) ----
	{
		displayName: 'Filter',
		name: 'filter',
		type: 'json',
		default: '{}',
		description:
			'Attio filter as a JSON object, e.g. {"name": {"$contains": "Acme"}}. Leave as {} for no filter. Mutually exclusive with a Filter View ID.',
		displayOptions: { show: { resource: ['record'], operation: ['getAll'] } },
	},
	{
		displayName: 'Sort',
		name: 'sorts',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		description: 'Attribute(s) to sort the results by',
		placeholder: 'Add Sort',
		options: [
			{
				name: 'sort',
				displayName: 'Sort',
				values: [
					{
						displayName: 'Attribute',
						name: 'attribute',
						type: 'string',
						default: '',
						description: 'The attribute slug to sort by (e.g. "name" or "created_at")',
					},
					{
						displayName: 'Direction',
						name: 'direction',
						type: 'options',
						default: 'asc',
						options: [
							{ name: 'Ascending', value: 'asc' },
							{ name: 'Descending', value: 'desc' },
						],
					},
				],
			},
		],
		displayOptions: { show: { resource: ['record'], operation: ['getAll'] } },
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: ['record'], operation: ['getAll'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { resource: ['record'], operation: ['getAll'], returnAll: [false] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['record'], operation: ['getAll'] } },
		options: [
			{
				displayName: 'Filter View ID',
				name: 'filterViewId',
				type: 'string',
				default: '',
				description:
					'Use a saved Attio view as the filter instead of a JSON Filter. Mutually exclusive with Filter.',
			},
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				default: 0,
				description: 'Number of records to skip (ignored when Return All is on)',
			},
		],
	},

	// ---- Search (records/search) ----
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		required: true,
		default: '',
		description: 'The free-text query to search records for across the selected objects',
		displayOptions: { show: { resource: ['record'], operation: ['search'] } },
	},
	{
		displayName: 'Object Names or IDs',
		name: 'searchObjects',
		type: 'multiOptions',
		typeOptions: { loadOptionsMethod: 'getObjects' },
		required: true,
		default: [],
		description:
			'The Attio objects to search across. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { resource: ['record'], operation: ['search'] } },
	},
	{
		displayName: 'Limit',
		name: 'searchLimit',
		type: 'number',
		// Attio's search endpoint caps `limit` at 25 (verified live 2026-08-17) — unlike
		// records/query, which takes far more. A default of 50 made Search 400 on its own
		// defaults, so the ceiling is both the default and the maximum here.
		typeOptions: { minValue: 1, maxValue: 25 },
		default: 25,
		description: 'Max number of results to return (Attio caps search results at 25)',
		displayOptions: { show: { resource: ['record'], operation: ['search'] } },
	},
	{
		displayName: 'Request As',
		name: 'requestAs',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description:
			'Advanced: run the search as a specific workspace member instead of the whole workspace. Leave empty to search as the workspace (the default for a plain API token).',
		displayOptions: { show: { resource: ['record'], operation: ['search'] } },
		options: [
			{
				displayName: 'Workspace Member ID',
				name: 'workspaceMemberId',
				type: 'string',
				default: '',
				description: 'Run the search as this workspace member (impersonation)',
			},
			{
				displayName: 'Email Address',
				name: 'emailAddress',
				type: 'string',
				default: '',
				description: "Run the search as the member with this email address (impersonation)",
			},
		],
	},
];
