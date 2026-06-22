/**
 * Resolves the `{object}` path segment for record endpoints.
 *
 * Attio accepts either an object's `api_slug` (e.g. `people`) or its UUID `object_id`
 * in the path. The dropdown supplies the slug; advanced users may type an id. Both pass
 * through unchanged (trimmed). Pure + framework-free (brief §9).
 */
export function objectPath(object: string): string {
	const trimmed = (object ?? '').trim();
	if (!trimmed) {
		throw new Error('An Attio object (slug or id) is required.');
	}
	return trimmed;
}
