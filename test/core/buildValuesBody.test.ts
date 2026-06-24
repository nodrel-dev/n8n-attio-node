import { buildValuesBody } from '../../nodes/Attio/core/buildValuesBody';

describe('buildValuesBody', () => {
	it('wraps an already-parsed object as { data: { values } }', () => {
		const out = buildValuesBody({ name: 'Acme', domains: ['acme.com'] });
		expect(out).toEqual({ data: { values: { name: 'Acme', domains: ['acme.com'] } } });
	});

	it('parses a JSON string into the values body', () => {
		const out = buildValuesBody('{"name":"Acme"}');
		expect(out).toEqual({ data: { values: { name: 'Acme' } } });
	});

	it('accepts an empty object (clear all / no values)', () => {
		expect(buildValuesBody({})).toEqual({ data: { values: {} } });
	});

	it('accepts an empty JSON-object string', () => {
		expect(buildValuesBody('{}')).toEqual({ data: { values: {} } });
	});

	it('treats a blank/whitespace string as an empty values object', () => {
		expect(buildValuesBody('   ')).toEqual({ data: { values: {} } });
	});

	it('throws a clear error for malformed JSON', () => {
		expect(() => buildValuesBody('{not json}')).toThrow(/Values.*valid JSON/i);
	});

	it('throws a clear error when the JSON is an array, not an object', () => {
		expect(() => buildValuesBody('[1,2,3]')).toThrow(/Values.*object/i);
	});

	it('throws a clear error when given a non-object value (array)', () => {
		expect(() => buildValuesBody([1, 2, 3] as unknown as object)).toThrow(/Values.*object/i);
	});

	it('throws a clear error when given a JSON primitive', () => {
		expect(() => buildValuesBody('42')).toThrow(/Values.*object/i);
	});

	it('does not mutate the input object', () => {
		const input = { name: 'Acme' };
		const snapshot = JSON.parse(JSON.stringify(input));
		buildValuesBody(input);
		expect(input).toEqual(snapshot);
	});
});
