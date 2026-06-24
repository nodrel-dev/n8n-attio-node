/**
 * Maps the Record **Update** multiselect mode to its HTTP verb (research.md R1, contract §4).
 *
 * Attio distinguishes how multiselect/list attributes are written by HTTP method on the same
 * `.../records/{record_id}` endpoint:
 *   - `append`    → `PATCH` — additive: keeps existing multiselect values and adds the new ones.
 *   - `overwrite` → `PUT`   — replace: the resulting set equals exactly what was sent.
 *
 * Pure + framework-free so it is unit-tested with no n8n runtime.
 */

export type UpdateMode = 'append' | 'overwrite';
export type UpdateHttpVerb = 'PATCH' | 'PUT';

export function updateVerb(mode: UpdateMode): UpdateHttpVerb {
	switch (mode) {
		case 'append':
			return 'PATCH';
		case 'overwrite':
			return 'PUT';
		default:
			throw new Error(`Unknown multiselect mode "${mode}" — expected "append" or "overwrite".`);
	}
}
