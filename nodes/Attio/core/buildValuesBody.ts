/**
 * Builds the Attio write body for Record Create/Update/Upsert (contract: record-operations §1/2/4).
 *
 * Pure + framework-free so it is unit-tested with no n8n runtime. The node passes the
 * **Values** param (n8n `json` type — either an already-parsed object or a raw JSON string)
 * and gets back the Attio envelope `{ data: { values: {...} } }`.
 *
 * Validation fails fast with a clear, user-facing message (FR-5): malformed JSON or a
 * non-object payload is rejected before any request is made.
 */

export interface AttioValuesBody {
	data: { values: Record<string, unknown> };
}

export function buildValuesBody(values: unknown): AttioValuesBody {
	const parsed = typeof values === 'string' ? parseJsonString(values) : values;

	if (!isPlainObject(parsed)) {
		throw new Error('Values must be a JSON object of attribute slugs to values (e.g. {"name": "Acme"}).');
	}

	// Shallow copy so the caller's object is never mutated downstream.
	return { data: { values: { ...parsed } } };
}

/** Parses a Values string; blank → empty object; invalid JSON → clear error. */
function parseJsonString(raw: string): unknown {
	if (!raw.trim()) {
		return {};
	}
	try {
		return JSON.parse(raw);
	} catch {
		throw new Error('Values must be valid JSON — could not parse the provided string.');
	}
}

/** True only for non-null, non-array plain objects. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
