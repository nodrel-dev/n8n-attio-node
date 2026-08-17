import { formatAttioError } from '../../nodes/Attio/core/formatAttioError';
import type { AttioErrorEnvelope } from '../../nodes/Attio/core/formatAttioError';

const envelope = (over: Partial<AttioErrorEnvelope> = {}): AttioErrorEnvelope => ({
	status_code: 400,
	type: 'invalid_request_error',
	code: 'value_not_found',
	message: 'Attio said something went wrong.',
	...over,
});

describe('formatAttioError', () => {
	it('surfaces status_code, type, code and message verbatim (400)', () => {
		const out = formatAttioError(400, envelope());
		expect(out).toContain('400');
		expect(out).toContain('invalid_request_error');
		expect(out).toContain('value_not_found');
		expect(out).toContain('Attio said something went wrong.');
	});

	it('prefers the envelope status_code over the transport status', () => {
		const out = formatAttioError(500, envelope({ status_code: 400 }));
		expect(out).toContain('400');
		expect(out).not.toContain('500');
	});

	it('adds an authentication hint on 401', () => {
		const out = formatAttioError(401, envelope({ status_code: 401, type: 'authentication_error', code: 'unauthorized', message: 'Bad token.' }));
		expect(out).toContain('401');
		expect(out.toLowerCase()).toContain('token');
	});

	it('reads 403 as a likely missing scope and lists the required scopes', () => {
		const out = formatAttioError(
			403,
			envelope({ status_code: 403, type: 'authorization_error', code: 'forbidden', message: 'Not allowed.' }),
			{ requiredScopes: ['record_permission:read-write', 'object_configuration:read'] },
		);
		expect(out).toContain('403');
		expect(out.toLowerCase()).toContain('scope');
		expect(out).toContain('record_permission:read-write');
		expect(out).toContain('object_configuration:read');
	});

	it('still gives a scope hint on 403 when no scopes are supplied', () => {
		const out = formatAttioError(403, envelope({ status_code: 403 }));
		expect(out.toLowerCase()).toContain('scope');
	});

	it('adds a not-found hint on 404', () => {
		const out = formatAttioError(404, envelope({ status_code: 404, type: 'not_found_error', code: 'not_found', message: 'Gone.' }));
		expect(out).toContain('404');
		expect(out.toLowerCase()).toContain('not found');
	});

	/**
	 * `Retry-After` is `HTTP-date | delta-seconds` (RFC 9110 §10.2.3) and **Attio sends both**,
	 * depending on which limiter trips — verified live 2026-08-17: `/v2/self` returned
	 * `Mon, 17 Aug 2026 14:30:00 GMT`, while the records-query concurrency limiter returned `9`.
	 *
	 * The delta-seconds case is the one that bit: `new Date('9')` is a *valid* Date
	 * (2001-09-01), so a seconds value silently rendered as a timestamp 25 years in the past.
	 * Seconds must therefore be detected before attempting a date parse.
	 */
	const rateLimited = (retryAfter?: string) =>
		formatAttioError(
			429,
			envelope({ status_code: 429, type: 'rate_limit_error', code: 'rate_limit_exceeded', message: 'Slow down.' }),
			retryAfter === undefined ? undefined : { retryAfter },
		);

	it('reports 429 as rate limiting and parses an HTTP-date Retry-After as a timestamp', () => {
		const retryAfter = 'Wed, 21 Oct 2026 07:28:00 GMT';
		const out = rateLimited(retryAfter);
		expect(out).toContain('429');
		expect(out.toLowerCase()).toContain('rate');
		expect(out).toContain(new Date(retryAfter).toISOString());
		expect(out).toContain(retryAfter);
	});

	it('treats a bare-integer Retry-After as delta-seconds, not a date', () => {
		const out = rateLimited('9');
		expect(out).toContain('429');
		expect(out).toContain('9 seconds');
		// The 2001 regression: `new Date('9')` parses, so this must never render as a date.
		expect(out).not.toContain('2001');
		expect(out).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
	});

	it('handles other delta-seconds values, including zero and large offsets', () => {
		expect(rateLimited('0')).toContain('0 seconds');
		expect(rateLimited('120')).toContain('120 seconds');
		expect(rateLimited('3600')).toContain('3600 seconds');
		expect(rateLimited('  30  ')).toContain('30 seconds');
		for (const v of ['0', '120', '3600']) {
			expect(rateLimited(v)).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
		}
	});

	it('echoes an unparseable Retry-After verbatim rather than inventing a time', () => {
		const out = rateLimited('soon-ish');
		expect(out).toContain('soon-ish');
		expect(out).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
	});

	it('always points the user at n8n Retry On Fail on a 429', () => {
		for (const v of [undefined, '9', 'Wed, 21 Oct 2026 07:28:00 GMT', 'garbage']) {
			expect(rateLimited(v)).toMatch(/Retry On Fail/i);
		}
	});

	it('does not crash when Retry-After is absent on a 429', () => {
		const out = formatAttioError(429, envelope({ status_code: 429, message: 'Slow down.' }));
		expect(out).toContain('429');
		expect(out.toLowerCase()).toContain('rate');
	});

	it('tolerates a missing/partial envelope', () => {
		expect(() => formatAttioError(500, undefined)).not.toThrow();
		const out = formatAttioError(500, {});
		expect(out).toContain('500');
	});

	it('never echoes a token-like secret (it is never passed one)', () => {
		const out = formatAttioError(401, envelope({ status_code: 401, message: 'Bad token.' }));
		expect(out).not.toContain('Bearer');
		expect(out).not.toMatch(/[a-f0-9]{32,}/i);
	});
});
