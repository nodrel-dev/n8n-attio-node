import { buildQueryBody } from '../../nodes/Attio/core/buildQueryBody';

describe('buildQueryBody', () => {
	it('wraps an already-parsed filter object', () => {
		const out = buildQueryBody({ filter: { name: 'Acme' } });
		expect(out).toEqual({ filter: { name: 'Acme' } });
	});

	it('parses a JSON-string filter', () => {
		const out = buildQueryBody({ filter: '{"name":"Acme"}' });
		expect(out).toEqual({ filter: { name: 'Acme' } });
	});

	it('uses filter_view_id when given (no filter)', () => {
		const out = buildQueryBody({ filterViewId: 'view_123' });
		expect(out).toEqual({ filter_view_id: 'view_123' });
	});

	it('returns an empty body when neither filter nor view is provided', () => {
		expect(buildQueryBody({})).toEqual({});
	});

	it('treats a blank/whitespace filter string as no filter', () => {
		expect(buildQueryBody({ filter: '   ' })).toEqual({});
	});

	it('treats an empty filter object as no filter', () => {
		expect(buildQueryBody({ filter: {} })).toEqual({});
	});

	it('throws when both a filter and a filter view ID are given (XOR)', () => {
		expect(() => buildQueryBody({ filter: { name: 'Acme' }, filterViewId: 'view_123' })).toThrow(
			/Filter.*Filter View/i,
		);
	});

	it('throws a clear error for a malformed filter string', () => {
		expect(() => buildQueryBody({ filter: '{not json}' })).toThrow(/Filter.*valid JSON/i);
	});

	it('throws when the filter is an array, not an object', () => {
		expect(() => buildQueryBody({ filter: '[1,2,3]' })).toThrow(/Filter.*object/i);
	});

	it('includes well-formed sorts', () => {
		const out = buildQueryBody({ sorts: [{ attribute: 'name', direction: 'asc' }] });
		expect(out).toEqual({ sorts: [{ attribute: 'name', direction: 'asc' }] });
	});

	it('drops sort entries missing an attribute and omits an empty sorts array', () => {
		const out = buildQueryBody({
			sorts: [
				{ attribute: '', direction: 'asc' },
				{ attribute: 'created_at', direction: 'desc' },
			],
		});
		expect(out).toEqual({ sorts: [{ attribute: 'created_at', direction: 'desc' }] });
	});

	it('omits sorts entirely when every entry is incomplete', () => {
		expect(buildQueryBody({ sorts: [{ attribute: '  ', direction: 'asc' }] })).toEqual({});
	});

	it('includes limit and offset when they are numbers', () => {
		expect(buildQueryBody({ limit: 50, offset: 100 })).toEqual({ limit: 50, offset: 100 });
	});

	it('omits limit and offset when undefined', () => {
		expect(buildQueryBody({ filter: { name: 'Acme' } })).toEqual({ filter: { name: 'Acme' } });
	});

	it('does not mutate the input filter object', () => {
		const filter = { name: 'Acme' };
		const snapshot = JSON.parse(JSON.stringify(filter));
		buildQueryBody({ filter });
		expect(filter).toEqual(snapshot);
	});
});
