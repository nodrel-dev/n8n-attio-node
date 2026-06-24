import { buildSearchBody } from '../../nodes/Attio/core/buildSearchBody';

describe('buildSearchBody', () => {
	it('builds a search body with the default workspace request_as', () => {
		const out = buildSearchBody({ query: 'acme', objects: ['companies', 'people'] });
		expect(out).toEqual({
			query: 'acme',
			objects: ['companies', 'people'],
			request_as: { type: 'workspace' },
		});
	});

	it('trims the query', () => {
		const out = buildSearchBody({ query: '  acme  ', objects: ['companies'] });
		expect(out.query).toBe('acme');
	});

	it('includes limit when it is a number', () => {
		const out = buildSearchBody({ query: 'acme', objects: ['companies'], limit: 25 });
		expect(out.limit).toBe(25);
	});

	it('omits limit when undefined', () => {
		const out = buildSearchBody({ query: 'acme', objects: ['companies'] });
		expect(out).not.toHaveProperty('limit');
	});

	it('passes through a workspace-member request_as for impersonation', () => {
		const out = buildSearchBody({
			query: 'acme',
			objects: ['companies'],
			requestAs: { type: 'workspace-member', workspace_member_id: 'wm_1' },
		});
		expect(out.request_as).toEqual({ type: 'workspace-member', workspace_member_id: 'wm_1' });
	});

	it('throws when the query is empty', () => {
		expect(() => buildSearchBody({ query: '   ', objects: ['companies'] })).toThrow(/query/i);
	});

	it('throws when no objects are provided', () => {
		expect(() => buildSearchBody({ query: 'acme', objects: [] })).toThrow(/object/i);
	});

	it('does not mutate the input objects array', () => {
		const objects = ['companies'];
		buildSearchBody({ query: 'acme', objects });
		expect(objects).toEqual(['companies']);
	});
});
