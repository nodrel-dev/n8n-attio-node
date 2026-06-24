/**
 * Builds the Attio body for cross-object Record **Search** (`POST /v2/objects/records/search`,
 * contract §6, research.md R3).
 *
 * Pure + framework-free so it is unit-tested with no n8n runtime. The node collects the
 * Query / Objects / Limit / Request As params and gets back `{ query, objects, limit?, request_as }`.
 *
 * Rules:
 *   - `query` and at least one object are required — empty values fail fast (FR-5).
 *   - `request_as` defaults to `{ type: 'workspace' }` (the natural context for a plain
 *     workspace-scoped token); member impersonation is passed through as an advanced option.
 */

export type SearchRequestAs =
	| { type: 'workspace' }
	| { type: 'workspace-member'; workspace_member_id?: string; email_address?: string };

export interface SearchBodyInput {
	query: string;
	objects: string[];
	limit?: number;
	requestAs?: SearchRequestAs;
}

export interface AttioSearchBody {
	query: string;
	objects: string[];
	limit?: number;
	request_as: SearchRequestAs;
}

const DEFAULT_REQUEST_AS: SearchRequestAs = { type: 'workspace' };

export function buildSearchBody(input: SearchBodyInput): AttioSearchBody {
	const query = typeof input.query === 'string' ? input.query.trim() : '';
	if (!query) {
		throw new Error('Search query is required.');
	}

	const objects = Array.isArray(input.objects) ? input.objects.filter(Boolean) : [];
	if (objects.length === 0) {
		throw new Error('Select at least one object to search.');
	}

	const body: AttioSearchBody = {
		query,
		objects: [...objects],
		request_as: input.requestAs ?? DEFAULT_REQUEST_AS,
	};

	if (typeof input.limit === 'number') {
		body.limit = input.limit;
	}

	return body;
}
