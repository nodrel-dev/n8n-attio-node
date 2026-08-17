/**
 * Faithful Attio error surfacing (Principle IX, FR-9).
 *
 * Pure + framework-free: takes the HTTP status, the Attio error envelope, and a small
 * context (required scopes for the operation, the raw Retry-After header). Returns a single
 * user-facing line that surfaces `status_code/type/code/message` verbatim and adds:
 *   - 401 -> authentication hint
 *   - 403 -> "likely a missing scope" + the scope set for that operation group
 *   - 404 -> not-found hint
 *   - 429 -> rate-limit message + Retry-After read as EITHER delta-seconds or an HTTP-date
 *            (RFC 9110 §10.2.3); Attio sends both, so seconds are detected first
 *
 * The function is never given the API token, so it cannot echo it (NFR-9).
 */

/** The shared Attio error envelope shape (400/401/403/404/429 all use this). */
export interface AttioErrorEnvelope {
	status_code?: number;
	type?: string;
	code?: string;
	message?: string;
}

export interface AttioErrorContext {
	/** Raw `Retry-After` response header (an HTTP date) — only meaningful on 429. */
	retryAfter?: string | null;
	/** Scopes the failed operation requires — used to enrich a 403. */
	requiredScopes?: string[];
}

export function formatAttioError(
	status: number,
	body: AttioErrorEnvelope | undefined,
	context: AttioErrorContext = {},
): string {
	const envelope = body ?? {};
	const effectiveStatus = envelope.status_code ?? status;
	const message = envelope.message ?? 'No error message was returned by Attio.';

	const descriptor = [envelope.type, envelope.code].filter(Boolean).join('/');
	const head = `Attio API error ${effectiveStatus}${descriptor ? ` (${descriptor})` : ''}: ${message}`;

	const hint = buildHint(effectiveStatus, context);
	return hint ? `${head} ${hint}` : head;
}

function buildHint(status: number, context: AttioErrorContext): string | undefined {
	switch (status) {
		case 401:
			return 'Authentication failed — check that the Attio API token is valid and has not been revoked.';
		case 403: {
			const base = 'Access denied — this is likely a missing token scope.';
			if (context.requiredScopes?.length) {
				return `${base} This operation requires: ${context.requiredScopes.join(', ')}.`;
			}
			return base;
		}
		case 404:
			return 'The requested resource was not found — check the object, record, or id.';
		case 429:
			return buildRateLimitHint(context.retryAfter);
		default:
			return undefined;
	}
}

/**
 * `Retry-After` is either `delta-seconds` or an `HTTP-date` (RFC 9110 §10.2.3), and **Attio
 * sends both** depending on which limiter trips — verified live 2026-08-17: `/v2/self` gave
 * `Mon, 17 Aug 2026 14:30:00 GMT`, the records-query concurrency limiter gave `9`.
 *
 * Seconds must be ruled out FIRST. `new Date('9')` is a valid Date (2001-09-01) and `new
 * Date('0')` is 2000-01-01, so date-parsing first turns a short retry delay into a timestamp
 * decades in the past — wrong, and wrong in a way that reads as authoritative.
 */
function buildRateLimitHint(retryAfter: string | null | undefined): string {
	let hint = 'Rate limited by Attio.';
	const raw = retryAfter?.trim();

	if (raw) {
		if (/^\d+$/.test(raw)) {
			const seconds = Number(raw);
			hint += ` Retry after ${seconds} seconds (Retry-After: ${raw}).`;
		} else {
			const resetAt = new Date(raw);
			if (!Number.isNaN(resetAt.getTime())) {
				hint += ` Retry after ${resetAt.toISOString()} (Retry-After: ${raw}).`;
			} else {
				hint += ` Retry-After header: ${raw}.`;
			}
		}
	}

	hint += ' Enable n8n "Retry On Fail" on this node for automatic backoff.';
	return hint;
}
