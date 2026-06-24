import { buildNoteBody } from '../../nodes/Attio/core/buildNoteBody';

const base = {
	parentObject: 'companies',
	parentRecordId: 'rec_1',
	title: 'Call notes',
	content: 'Talked about pricing.',
	format: 'plaintext' as const,
};

describe('buildNoteBody', () => {
	it('wraps the required fields in the Attio { data } envelope', () => {
		expect(buildNoteBody(base)).toEqual({
			data: {
				parent_object: 'companies',
				parent_record_id: 'rec_1',
				title: 'Call notes',
				format: 'plaintext',
				content: 'Talked about pricing.',
			},
		});
	});

	it('defaults the format to plaintext when omitted', () => {
		const out = buildNoteBody({ ...base, format: undefined });
		expect(out.data.format).toBe('plaintext');
	});

	it('passes through a markdown format', () => {
		const out = buildNoteBody({ ...base, format: 'markdown' });
		expect(out.data.format).toBe('markdown');
	});

	it('includes created_at and meeting_id only when provided', () => {
		const out = buildNoteBody({ ...base, createdAt: '2026-01-02T03:04:05Z', meetingId: 'meet_1' });
		expect(out.data.created_at).toBe('2026-01-02T03:04:05Z');
		expect(out.data.meeting_id).toBe('meet_1');
	});

	it('omits created_at and meeting_id when absent', () => {
		const out = buildNoteBody(base);
		expect(out.data).not.toHaveProperty('created_at');
		expect(out.data).not.toHaveProperty('meeting_id');
	});

	it('trims string fields', () => {
		const out = buildNoteBody({
			...base,
			parentObject: '  companies  ',
			parentRecordId: '  rec_1  ',
			title: '  Call notes  ',
		});
		expect(out.data.parent_object).toBe('companies');
		expect(out.data.parent_record_id).toBe('rec_1');
		expect(out.data.title).toBe('Call notes');
	});

	it('throws when the parent object is empty', () => {
		expect(() => buildNoteBody({ ...base, parentObject: '   ' })).toThrow(/parent object/i);
	});

	it('throws when the parent record ID is empty', () => {
		expect(() => buildNoteBody({ ...base, parentRecordId: '' })).toThrow(/parent record/i);
	});

	it('throws when the title is empty', () => {
		expect(() => buildNoteBody({ ...base, title: '' })).toThrow(/title/i);
	});

	it('throws when the content is empty', () => {
		expect(() => buildNoteBody({ ...base, content: '   ' })).toThrow(/content/i);
	});
});
