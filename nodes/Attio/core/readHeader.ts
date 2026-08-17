/**
 * Case-insensitive response-header lookup.
 *
 * Pure core (Principle VIII): the parameter is typed structurally so no n8n types reach
 * `core/`. n8n's `IN8nHttpFullResponse['headers']` is assignable to it.
 *
 * Header field names are case-insensitive per RFC 9110 §5.1, and the casing that arrives
 * here depends on whichever HTTP layer sits under n8n rather than on anything this node
 * controls. The one caller that matters is the 429 path, which needs `Retry-After` to put a
 * concrete time in the rate-limit message (NFR-10) — and a miss there is silent, since the
 * message still renders, just without the time. So match on any casing rather than guessing.
 */

/** Loose shape of a header bag: names to a single value or a repeated one. */
export type HeaderBag = Record<string, unknown> | undefined;

export function readHeader(headers: HeaderBag, name: string): string | undefined {
	if (!headers) {
		return undefined;
	}

	const wanted = name.toLowerCase();
	const match = Object.keys(headers).find((key) => key.toLowerCase() === wanted);
	if (match === undefined) {
		return undefined;
	}

	// A repeated header arrives as an array; the first value is the operative one.
	const raw = headers[match];
	const value = Array.isArray(raw) ? raw[0] : raw;

	if (value === null || value === undefined) {
		return undefined;
	}

	return String(value);
}
