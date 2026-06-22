import { objectPath } from '../../nodes/Attio/core/objectPath';

describe('objectPath', () => {
	it('passes a slug through unchanged', () => {
		expect(objectPath('people')).toBe('people');
		expect(objectPath('companies')).toBe('companies');
	});

	it('passes a UUID object id through unchanged', () => {
		const id = '49b3f4e6-7a1c-4a1e-9f0a-0b1c2d3e4f5a';
		expect(objectPath(id)).toBe(id);
	});

	it('trims surrounding whitespace', () => {
		expect(objectPath('  deals  ')).toBe('deals');
	});

	it('throws a clear error on an empty or whitespace-only value', () => {
		expect(() => objectPath('')).toThrow(/object/i);
		expect(() => objectPath('   ')).toThrow(/object/i);
	});
});
