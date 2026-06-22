/**
 * Faithful Attio error surfacing (Principle IX, FR-9).
 *
 * Pure + framework-free: takes the HTTP status, the Attio error envelope, and a small
 * context (required scopes for the operation, the raw Retry-After header). Returns a single
 * user-facing line that surfaces `status_code/type/code/message` verbatim and adds:
 *   - 401 -> authentication hint
 *   - 403 -> "likely a missing scope" + the scope set for that operation group
 *   - 404 -> not-found hint
 *   - 429 -> rate-limit message + Retry-After parsed as a DATE (never seconds)
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

function buildRateLimitHint(retryAfter: string | null | undefined): string {
	let hint = 'Rate limited by Attio.';
	if (retryAfter) {
		const resetAt = new Date(retryAfter);
		if (!Number.isNaN(resetAt.getTime())) {
			// Retry-After is an HTTP date (a reset timestamp), not a seconds count.
			hint += ` Retry after ${resetAt.toISOString()} (Retry-After: ${retryAfter}).`;
		} else {
			hint += ` Retry-After header: ${retryAfter}.`;
		}
	}
	hint += ' Enable n8n "Retry On Fail" on this node for automatic backoff.';
	return hint;
}
