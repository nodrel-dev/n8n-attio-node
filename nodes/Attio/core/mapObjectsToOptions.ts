/**
 * Maps the `GET /v2/objects` payload into n8n dropdown options (brief §9, research.md R7).
 *
 * Pure + framework-free so it is unit-tested with no n8n runtime; the programmatic
 * `getObjects` loadOptions method fetches the data and delegates the shaping here.
 *
 *   - option **name**  = `plural_noun` ?? `singular_noun` ?? `api_slug`
 *   - option **value** = `api_slug` (the `{object}` path segment)
 */

/** One element of `GET /v2/objects` → `data: AttioObject[]`. */
export interface AttioObject {
	api_slug: string;
	plural_noun?: string;
	singular_noun?: string;
	object_id?: string;
}

export interface AttioObjectOption {
	name: string;
	value: string;
}

export function mapObjectsToOptions(objects: readonly AttioObject[]): AttioObjectOption[] {
	return objects.map((object) => ({
		name: firstNonEmpty(object.plural_noun, object.singular_noun, object.api_slug),
		value: object.api_slug,
	}));
}

/** Returns the first defined, non-empty (post-trim) string. Falls back to '' only if all are blank. */
function firstNonEmpty(...candidates: Array<string | undefined>): string {
	for (const candidate of candidates) {
		if (candidate && candidate.trim()) {
			return candidate;
		}
	}
	return '';
}
