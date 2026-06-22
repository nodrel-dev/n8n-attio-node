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

	it('reports 429 as rate limiting and parses Retry-After as a DATE (never seconds)', () => {
		const retryAfter = 'Wed, 21 Oct 2026 07:28:00 GMT';
		const out = formatAttioError(
			429,
			envelope({ status_code: 429, type: 'rate_limit_error', code: 'rate_limit_exceeded', message: 'Slow down.' }),
			{ retryAfter },
		);
		expect(out).toContain('429');
		expect(out.toLowerCase()).toContain('rate');
		// Parsed as an HTTP date -> ISO timestamp, not treated as a seconds offset.
		expect(out).toContain(new Date(retryAfter).toISOString());
		expect(out).toContain(retryAfter);
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
