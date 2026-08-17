/**
 * Shared declarative routing fragments used by every operation (T019/T020).
 *
 * Response handling is uniform across the node:
 *   - Errors: the node sets `ignoreHttpStatusErrors: true` in `requestDefaults`, so non-2xx
 *     responses flow into `postReceive`. `makeAttioErrorPostReceive` inspects the status and
 *     throws a NodeApiError carrying `formatAttioError`'s message (403 scope hint, 429 date, etc.).
 *     It must be the FIRST postReceive action on every operation.
 *   - Success unwrap: `unwrapData` lifts the top-level `data` key into n8n items (one per array
 *     element for lists, one for single-object responses).
 *   - DELETE: `makeDeleteSuccess` synthesises `{ success: true, <idKey>: <id> }` (no meaningful body).
 *
 * `continueOnFail` needs no wiring here — n8n's routing engine already runs each input item
 * independently and routes a thrown error to the node's "Continue On Fail" output when enabled.
 */
import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	JsonObject,
	PostReceiveAction,
	PreSendAction,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { formatAttioError, type AttioErrorEnvelope } from '../core/formatAttioError';
import { readHeader } from '../core/readHeader';
import { buildValuesBody } from '../core/buildValuesBody';
import { buildQueryBody, type QueryBodyInput, type QuerySort } from '../core/buildQueryBody';
import { buildSearchBody, type SearchBodyInput, type SearchRequestAs } from '../core/buildSearchBody';
import { buildNoteBody, type NoteBodyInput, type NoteFormat } from '../core/buildNoteBody';
import {
	buildTaskCreateBody,
	buildTaskUpdateBody,
	type TaskAssignee,
	type TaskCreateOptions,
	type TaskLinkedRecord,
	type TaskUpdateOptions,
} from '../core/buildTaskBodies';

/** Lifts the top-level `data` property into items (n8n splits arrays into one item each). */
export const unwrapData = {
	type: 'rootProperty' as const,
	properties: { property: 'data' },
};

/**
 * Builds the error-handling postReceive for an operation. Supply the operation's required
 * scopes so a 403 names them. Place this FIRST in the operation's `postReceive` array.
 */
export function makeAttioErrorPostReceive(requiredScopes?: string[]): PostReceiveAction {
	return async function attioErrorPostReceive(
		this: IExecuteSingleFunctions,
		items: INodeExecutionData[],
		response: IN8nHttpFullResponse,
	): Promise<INodeExecutionData[]> {
		const status = response.statusCode;
		if (status < 400) {
			return items;
		}

		const body = (response.body ?? {}) as AttioErrorEnvelope;
		const retryAfter = readHeader(response.headers, 'retry-after');
		const message = formatAttioError(status, body, { requiredScopes, retryAfter });

		throw new NodeApiError(this.getNode(), (body as unknown as JsonObject) ?? {}, {
			message,
			httpCode: String(status),
		});
	};
}

/**
 * Builds a preSend that turns the **Values** (`json`) param into the Attio write body
 * `{ data: { values } }` via `buildValuesBody`. Validation runs BEFORE the request, so a
 * malformed payload fails fast as a NodeOperationError (FR-5, contract §1) without a round-trip.
 * Used by Create/Update/Upsert; `paramName` defaults to `values`.
 */
export function makeValuesBodyPreSend(paramName = 'values'): PreSendAction {
	return async function valuesBodyPreSend(
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const raw = this.getNodeParameter(paramName, {});
		try {
			return { ...requestOptions, body: buildValuesBody(raw) };
		} catch (error) {
			throw new NodeOperationError(this.getNode(), error as Error, {
				description: 'Fix the Values field so it is a valid JSON object of attribute slugs.',
			});
		}
	};
}

/**
 * Builds a preSend that validates the required **Matching Attribute** and adds it to the query
 * string for Record Upsert (`PUT .../records?matching_attribute=...`, contract §2). An empty
 * value fails BEFORE the request as a NodeOperationError (AS-B2, FR-5). `paramName` defaults
 * to `matchingAttribute`.
 */
export function makeMatchingAttributePreSend(paramName = 'matchingAttribute'): PreSendAction {
	return async function matchingAttributePreSend(
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const raw = this.getNodeParameter(paramName, '') as string;
		const attribute = typeof raw === 'string' ? raw.trim() : '';
		if (!attribute) {
			throw new NodeOperationError(this.getNode(), 'Matching Attribute is required for Create or Update.', {
				description: 'Set the attribute slug Attio should match on (e.g. "domains" or a unique custom attribute).',
			});
		}
		return {
			...requestOptions,
			qs: { ...(requestOptions.qs as Record<string, unknown> | undefined), matching_attribute: attribute },
		};
	};
}

/**
 * Builds a preSend that assembles the Record **Get Many** query body from the node's Filter /
 * Filter View / Sort / Limit / offset params via `buildQueryBody` (contract §5). Validation
 * (filter XOR filter_view_id, malformed JSON) runs BEFORE the request as a NodeOperationError.
 * For "Return All", n8n's offset pagination overrides `limit`/`offset` per page.
 */
export function makeQueryBodyPreSend(): PreSendAction {
	return async function queryBodyPreSend(
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const additional = this.getNodeParameter('additionalFields', {}) as {
			filterViewId?: string;
			offset?: number;
		};
		const sortsParam = this.getNodeParameter('sorts', {}) as { sort?: QuerySort[] };
		const returnAll = this.getNodeParameter('returnAll', false) as boolean;

		const input: QueryBodyInput = {
			filter: this.getNodeParameter('filter', {}),
			filterViewId: additional.filterViewId,
			sorts: sortsParam.sort,
			limit: returnAll ? undefined : (this.getNodeParameter('limit', 50) as number),
			offset: typeof additional.offset === 'number' ? additional.offset : undefined,
		};

		try {
			return { ...requestOptions, body: buildQueryBody(input) };
		} catch (error) {
			throw new NodeOperationError(this.getNode(), error as Error, {
				description: 'Fix the Filter / Filter View so they form a valid, non-conflicting query.',
			});
		}
	};
}

/**
 * Builds a preSend that assembles the cross-object **Search** body from the node's Query /
 * Objects / Limit / Request As params via `buildSearchBody` (contract §6). Missing query or
 * objects fail BEFORE the request as a NodeOperationError. `request_as` defaults to workspace;
 * a Workspace Member ID or Email Address (advanced) switches to member impersonation.
 */
export function makeSearchBodyPreSend(): PreSendAction {
	return async function searchBodyPreSend(
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const requestAsParam = this.getNodeParameter('requestAs', {}) as {
			workspaceMemberId?: string;
			emailAddress?: string;
		};
		const memberId = requestAsParam.workspaceMemberId?.trim();
		const email = requestAsParam.emailAddress?.trim();
		let requestAs: SearchRequestAs | undefined;
		if (memberId) {
			requestAs = { type: 'workspace-member', workspace_member_id: memberId };
		} else if (email) {
			requestAs = { type: 'workspace-member', email_address: email };
		}

		const limit = this.getNodeParameter('searchLimit', undefined) as number | undefined;
		const input: SearchBodyInput = {
			query: this.getNodeParameter('query', '') as string,
			objects: this.getNodeParameter('searchObjects', []) as string[],
			limit: typeof limit === 'number' ? limit : undefined,
			requestAs,
		};

		try {
			return { ...requestOptions, body: buildSearchBody(input) };
		} catch (error) {
			throw new NodeOperationError(this.getNode(), error as Error, {
				description: 'Provide a search query and select at least one object to search.',
			});
		}
	};
}

/**
 * Builds a preSend that assembles the Note **Create** body from the node's Parent Object /
 * Parent Record ID / Title / Format / Content (+ optional created_at, meeting_id) params via
 * `buildNoteBody` (contract §1). A missing parent link, title, or content fails BEFORE the
 * request as a NodeOperationError (FR-5).
 */
export function makeNoteBodyPreSend(): PreSendAction {
	return async function noteBodyPreSend(
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const additional = this.getNodeParameter('additionalFields', {}) as {
			createdAt?: string;
			meetingId?: string;
		};
		const input: NoteBodyInput = {
			parentObject: this.getNodeParameter('parentObject', '') as string,
			parentRecordId: this.getNodeParameter('parentRecordId', '') as string,
			title: this.getNodeParameter('title', '') as string,
			content: this.getNodeParameter('content', '') as string,
			format: this.getNodeParameter('format', 'plaintext') as NoteFormat,
			createdAt: additional.createdAt,
			meetingId: additional.meetingId,
		};

		try {
			return { ...requestOptions, body: buildNoteBody(input) };
		} catch (error) {
			throw new NodeOperationError(this.getNode(), error as Error, {
				description: "Fill in the note's parent record, title, and content.",
			});
		}
	};
}

/**
 * Builds a preSend that adds the optional Note **Get Many** parent filters (`parent_object`,
 * `parent_record_id`) to the query string (contract §2). `limit`/`offset` are handled by n8n's
 * offset pagination, so they are not set here.
 */
export function makeNoteListPreSend(): PreSendAction {
	return async function noteListPreSend(
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const parentObject = (this.getNodeParameter('parentObjectFilter', '') as string).trim();
		const parentRecordId = (this.getNodeParameter('parentRecordIdFilter', '') as string).trim();
		const qs = { ...(requestOptions.qs as Record<string, string> | undefined) };
		if (parentObject) {
			qs.parent_object = parentObject;
		}
		if (parentRecordId) {
			qs.parent_record_id = parentRecordId;
		}
		return { ...requestOptions, qs };
	};
}

/** Reads the shared Linked Records fixedCollection (`linkedRecords.record`). */
function readLinkedRecords(ctx: IExecuteSingleFunctions): TaskLinkedRecord[] | undefined {
	const param = ctx.getNodeParameter('linkedRecords', {}) as { record?: TaskLinkedRecord[] };
	return param.record;
}

/** Reads the shared Assignees fixedCollection (`assignees.assignee`). */
function readAssignees(ctx: IExecuteSingleFunctions): TaskAssignee[] | undefined {
	const param = ctx.getNodeParameter('assignees', {}) as { assignee?: TaskAssignee[] };
	return param.assignee;
}

/**
 * Builds a preSend that assembles the Task **Create** body via `buildTaskCreateBody` (contract §1).
 * `format` is hardcoded plaintext; an empty Content fails BEFORE the request (FR-5). Attio requires
 * every key present, so deadline/completion/links/assignees are always sent (with safe defaults).
 */
export function makeTaskCreateBodyPreSend(): PreSendAction {
	return async function taskCreateBodyPreSend(
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const input: TaskCreateOptions = {
			content: this.getNodeParameter('content', '') as string,
			deadlineAt: this.getNodeParameter('deadlineAt', '') as string,
			isCompleted: this.getNodeParameter('isCompleted', false) as boolean,
			linkedRecords: readLinkedRecords(this),
			assignees: readAssignees(this),
		};

		try {
			return { ...requestOptions, body: buildTaskCreateBody(input) };
		} catch (error) {
			throw new NodeOperationError(this.getNode(), error as Error, {
				description: 'Provide the task Content (it can only be set at creation time).',
			});
		}
	};
}

/**
 * Builds a preSend that assembles the Task **Update** body via `buildTaskUpdateBody` (contract §2).
 * Content is **never** sent (write-once, Principle VI/FR-14). Deadline/completion come from the
 * Update Fields collection (only sent when added); links/assignees are sent only when ≥1 row.
 */
export function makeTaskUpdateBodyPreSend(): PreSendAction {
	return async function taskUpdateBodyPreSend(
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const updateFields = this.getNodeParameter('updateFields', {}) as {
			deadlineAt?: string;
			isCompleted?: boolean;
		};
		const linkedRecords = readLinkedRecords(this);
		const assignees = readAssignees(this);

		const input: TaskUpdateOptions = {
			deadlineAt: 'deadlineAt' in updateFields ? updateFields.deadlineAt : undefined,
			isCompleted: 'isCompleted' in updateFields ? updateFields.isCompleted : undefined,
			linkedRecords: linkedRecords && linkedRecords.length > 0 ? linkedRecords : undefined,
			assignees: assignees && assignees.length > 0 ? assignees : undefined,
		};

		return { ...requestOptions, body: buildTaskUpdateBody(input) };
	};
}

/**
 * Builds a preSend that adds the optional Task **Get Many** filters (`linked_object`,
 * `linked_record_id`, `assignee`, `is_completed`) to the query string (contract §4).
 * `limit`/`offset` are handled by n8n's offset pagination.
 */
export function makeTaskListPreSend(): PreSendAction {
	return async function taskListPreSend(
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const filters = this.getNodeParameter('filters', {}) as {
			linkedObject?: string;
			linkedRecordId?: string;
			assignee?: string;
			isCompleted?: boolean;
		};
		const linkedObject = filters.linkedObject?.trim();
		const linkedRecordId = filters.linkedRecordId?.trim();
		// Attio rejects one without the other (both must be provided together, or neither).
		if (Boolean(linkedObject) !== Boolean(linkedRecordId)) {
			throw new NodeOperationError(
				this.getNode(),
				'Linked Object and Linked Record ID must be used together.',
				{ description: "Provide both filters to list a record's tasks, or neither." },
			);
		}

		const qs = { ...(requestOptions.qs as Record<string, string> | undefined) };
		if (linkedObject && linkedRecordId) {
			qs.linked_object = linkedObject;
			qs.linked_record_id = linkedRecordId;
		}
		if (filters.assignee?.trim()) {
			qs.assignee = filters.assignee.trim();
		}
		if (typeof filters.isCompleted === 'boolean') {
			qs.is_completed = String(filters.isCompleted);
		}
		return { ...requestOptions, qs };
	};
}

/**
 * Builds a postReceive that discards the (empty) DELETE body and returns a success indicator.
 * `jsonKey` is the response field (e.g. `record_id`); `paramName` is the n8n parameter to read it from.
 */
export function makeDeleteSuccess(jsonKey: string, paramName: string): PostReceiveAction {
	// Signature is narrower than PostReceiveAction on purpose: the DELETE body is empty, so
	// neither the incoming items nor the response are needed (TS allows the assignment).
	return async function deleteSuccessPostReceive(
		this: IExecuteSingleFunctions,
	): Promise<INodeExecutionData[]> {
		const id = this.getNodeParameter(paramName, '') as string;
		return [{ json: { success: true, [jsonKey]: id } }];
	};
}

// `readHeader` now lives in `core/readHeader.ts` so its case handling is unit-testable
// without pulling n8n types into the pure core. The local copy it replaced matched only the
// exact and lower-cased name, so a canonical `Retry-After` silently read as `undefined`.
