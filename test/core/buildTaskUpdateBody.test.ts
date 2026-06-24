import { buildTaskUpdateBody } from '../../nodes/Attio/core/buildTaskBodies';

describe('buildTaskUpdateBody', () => {
	it('never includes content, even if somehow passed', () => {
		const out = buildTaskUpdateBody({ isCompleted: true } as never);
		expect(out.data).not.toHaveProperty('content');
		expect(out.data).not.toHaveProperty('format');
	});

	it('returns an empty data object when nothing is provided', () => {
		expect(buildTaskUpdateBody({})).toEqual({ data: {} });
	});

	it('includes only the fields that are provided (partial PATCH)', () => {
		expect(buildTaskUpdateBody({ isCompleted: true })).toEqual({ data: { is_completed: true } });
	});

	it('includes a provided deadline', () => {
		expect(buildTaskUpdateBody({ deadlineAt: '2026-03-01T00:00:00Z' })).toEqual({
			data: { deadline_at: '2026-03-01T00:00:00Z' },
		});
	});

	it('maps a blank deadline to null (explicit clear)', () => {
		expect(buildTaskUpdateBody({ deadlineAt: '   ' })).toEqual({ data: { deadline_at: null } });
	});

	it('maps linked records and assignees when provided', () => {
		const out = buildTaskUpdateBody({
			linkedRecords: [{ object: 'companies', recordId: 'rec_1' }],
			assignees: [{ email: 'a@b.com' }],
		});
		expect(out.data.linked_records).toEqual([
			{ target_object: 'companies', target_record_id: 'rec_1' },
		]);
		expect(out.data.assignees).toEqual([{ workspace_member_email_address: 'a@b.com' }]);
	});

	it('omits linked_records / assignees when their arrays are undefined', () => {
		const out = buildTaskUpdateBody({ isCompleted: false });
		expect(out.data).not.toHaveProperty('linked_records');
		expect(out.data).not.toHaveProperty('assignees');
	});
});
