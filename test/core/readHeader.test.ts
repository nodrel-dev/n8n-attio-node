import { readHeader } from '../../nodes/Attio/core/readHeader';

/**
 * `readHeader` exists for one job that matters: pulling `Retry-After` off a 429 so the
 * rate-limit message can name a concrete time (NFR-10, T088). Attio sends that header in
 * canonical HTTP casing, and header casing is not ours to control — it depends on whatever
 * HTTP layer sits under n8n. A miss here is silent: the message still renders, just without
 * the one piece of information the user needs, so these cases are worth pinning down.
 */
describe('readHeader', () => {
	it('reads a header stored in the exact case requested', () => {
		expect(readHeader({ 'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT' }, 'retry-after')).toBe(
			'Wed, 21 Oct 2026 07:28:00 GMT',
		);
	});

	it('reads a header regardless of the case it is stored in', () => {
		// Node lowercases response headers, but n8n's HTTP layer is free to change and
		// `Retry-After` is the casing Attio actually puts on the wire.
		expect(readHeader({ 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' }, 'retry-after')).toBe(
			'Wed, 21 Oct 2026 07:28:00 GMT',
		);
		expect(readHeader({ 'RETRY-AFTER': '120' }, 'retry-after')).toBe('120');
		expect(readHeader({ 'ReTrY-aFtEr': '120' }, 'retry-after')).toBe('120');
	});

	it('reads a header regardless of the case it is requested in', () => {
		expect(readHeader({ 'retry-after': '120' }, 'Retry-After')).toBe('120');
	});

	it('takes the first value when a header repeats', () => {
		expect(readHeader({ 'retry-after': ['120', '240'] }, 'retry-after')).toBe('120');
	});

	it('returns undefined when the header is absent', () => {
		expect(readHeader({ 'content-type': 'application/json' }, 'retry-after')).toBeUndefined();
	});

	it('returns undefined when there are no headers at all', () => {
		expect(readHeader(undefined, 'retry-after')).toBeUndefined();
		expect(readHeader({}, 'retry-after')).toBeUndefined();
	});

	it('returns undefined for an empty repeated header rather than an empty slot', () => {
		expect(readHeader({ 'retry-after': [] }, 'retry-after')).toBeUndefined();
	});

	it('does not confuse a similarly named header', () => {
		expect(readHeader({ 'x-retry-after-ms': '5000' }, 'retry-after')).toBeUndefined();
	});

	it('coerces a non-string value to a string so a numeric offset still reaches the message', () => {
		expect(readHeader({ 'retry-after': 120 }, 'retry-after')).toBe('120');
	});

	it('ignores null and undefined header values', () => {
		expect(readHeader({ 'retry-after': null }, 'retry-after')).toBeUndefined();
		expect(readHeader({ 'retry-after': undefined }, 'retry-after')).toBeUndefined();
	});
});
