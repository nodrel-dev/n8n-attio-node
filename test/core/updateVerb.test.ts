import { updateVerb } from '../../nodes/Attio/core/updateVerb';

describe('updateVerb', () => {
	it('maps append mode to PATCH (additive multiselect)', () => {
		expect(updateVerb('append')).toBe('PATCH');
	});

	it('maps overwrite mode to PUT (replace the set)', () => {
		expect(updateVerb('overwrite')).toBe('PUT');
	});

	it('throws a clear error for an unknown mode', () => {
		expect(() => updateVerb('replace' as never)).toThrow(/multiselect mode/i);
	});
});
