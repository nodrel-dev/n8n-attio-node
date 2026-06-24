import { mapObjectsToOptions } from '../../nodes/Attio/core/mapObjectsToOptions';
import type { AttioObject } from '../../nodes/Attio/core/mapObjectsToOptions';

const obj = (over: Partial<AttioObject> = {}): AttioObject => ({
	api_slug: 'people',
	plural_noun: 'People',
	singular_noun: 'Person',
	...over,
});

describe('mapObjectsToOptions', () => {
	it('uses plural_noun as the option name and api_slug as the value', () => {
		const out = mapObjectsToOptions([obj({ api_slug: 'companies', plural_noun: 'Companies', singular_noun: 'Company' })]);
		expect(out).toEqual([{ name: 'Companies', value: 'companies' }]);
	});

	it('falls back to singular_noun when plural_noun is missing', () => {
		const out = mapObjectsToOptions([obj({ api_slug: 'deals', plural_noun: undefined, singular_noun: 'Deal' })]);
		expect(out).toEqual([{ name: 'Deal', value: 'deals' }]);
	});

	it('falls back to api_slug when both nouns are missing', () => {
		const out = mapObjectsToOptions([obj({ api_slug: 'workspaces', plural_noun: undefined, singular_noun: undefined })]);
		expect(out).toEqual([{ name: 'workspaces', value: 'workspaces' }]);
	});

	it('treats an empty-string plural_noun as absent and falls back to singular_noun', () => {
		const out = mapObjectsToOptions([obj({ api_slug: 'deals', plural_noun: '', singular_noun: 'Deal' })]);
		expect(out).toEqual([{ name: 'Deal', value: 'deals' }]);
	});

	it('maps multiple objects preserving order', () => {
		const out = mapObjectsToOptions([
			obj({ api_slug: 'people', plural_noun: 'People' }),
			obj({ api_slug: 'companies', plural_noun: 'Companies' }),
		]);
		expect(out).toEqual([
			{ name: 'People', value: 'people' },
			{ name: 'Companies', value: 'companies' },
		]);
	});

	it('returns an empty array for no objects', () => {
		expect(mapObjectsToOptions([])).toEqual([]);
	});

	it('does not mutate the input array or its elements', () => {
		const input = [obj({ api_slug: 'people', plural_noun: 'People' })];
		const snapshot = JSON.parse(JSON.stringify(input));
		mapObjectsToOptions(input);
		expect(input).toEqual(snapshot);
	});
});
