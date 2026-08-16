/**
 * Builds the Attio query body for Record **Get Many** (`POST .../records/query`, contract §5).
 *
 * Pure + framework-free so it is unit-tested with no n8n runtime. The node collects the
 * Filter / Filter View / Sort / Limit / offset params and gets back the Attio request body
 * `{ filter?, filter_view_id?, sorts?, limit?, offset? }`.
 *
 * Rules (research.md / contract §5):
 *   - `filter` and `filter_view_id` are mutually exclusive — supplying both fails fast (FR-5).
 *   - `filter` accepts an already-parsed object or a raw JSON string; blank/empty → omitted.
 *   - Incomplete sort rows (no attribute) are dropped; an empty `sorts` is omitted.
 *   - `limit`/`offset` are included only when they are real numbers (offset is also driven by
 *     n8n's offset pagination for "Return All").
 */

import { tryParseJson } from './tryParseJson';

export interface QuerySort {
	attribute: string;
	direction: string;
}

export interface QueryBodyInput {
	filter?: unknown;
	filterViewId?: string;
	sorts?: QuerySort[];
	limit?: number;
	offset?: number;
}

export interface AttioQueryBody {
	filter?: Record<string, unknown>;
	filter_view_id?: string;
	sorts?: QuerySort[];
	limit?: number;
	offset?: number;
}

export function buildQueryBody(input: QueryBodyInput): AttioQueryBody {
	const filter = normaliseFilter(input.filter);
	const filterViewId = typeof input.filterViewId === 'string' ? input.filterViewId.trim() : '';

	if (filter && filterViewId) {
		throw new Error('Provide either a Filter or a Filter View ID, not both.');
	}

	const body: AttioQueryBody = {};

	if (filter) {
		body.filter = filter;
	} else if (filterViewId) {
		body.filter_view_id = filterViewId;
	}

	const sorts = normaliseSorts(input.sorts);
	if (sorts.length > 0) {
		body.sorts = sorts;
	}

	if (typeof input.limit === 'number') {
		body.limit = input.limit;
	}
	if (typeof input.offset === 'number') {
		body.offset = input.offset;
	}

	return body;
}

/** Parses/validates the Filter; blank or empty object → `undefined` (no filter). */
function normaliseFilter(filter: unknown): Record<string, unknown> | undefined {
	if (filter === undefined || filter === null) {
		return undefined;
	}

	const parsed = typeof filter === 'string' ? parseFilterString(filter) : filter;
	if (parsed === undefined) {
		return undefined;
	}

	if (!isPlainObject(parsed)) {
		throw new Error('Filter must be a JSON object (e.g. {"name": {"$eq": "Acme"}}).');
	}

	if (Object.keys(parsed).length === 0) {
		return undefined;
	}

	// Shallow copy so the caller's object is never mutated downstream.
	return { ...parsed };
}

/** Parses a Filter string; blank → no filter; invalid JSON → clear error. */
function parseFilterString(raw: string): unknown {
	if (!raw.trim()) {
		return undefined;
	}
	const result = tryParseJson(raw);
	if (!result.ok) {
		throw new Error('Filter must be valid JSON — could not parse the provided string.');
	}
	return result.value;
}

/** Keeps only sort rows with a non-blank attribute. */
function normaliseSorts(sorts: QuerySort[] | undefined): QuerySort[] {
	if (!Array.isArray(sorts)) {
		return [];
	}
	return sorts
		.filter((sort) => typeof sort?.attribute === 'string' && sort.attribute.trim() !== '')
		.map((sort) => ({ attribute: sort.attribute.trim(), direction: sort.direction }));
}

/** True only for non-null, non-array plain objects. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
