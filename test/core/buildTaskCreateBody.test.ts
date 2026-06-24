import { buildTaskCreateBody } from '../../nodes/Attio/core/buildTaskBodies';

describe('buildTaskCreateBody', () => {
	it('hardcodes format plaintext and fills the required keys with safe defaults', () => {
		expect(buildTaskCreateBody({ content: 'Follow up' })).toEqual({
			data: {
				content: 'Follow up',
				format: 'plaintext',
				deadline_at: null,
				is_completed: false,
				linked_records: [],
				assignees: [],
			},
		});
	});

	it('includes a provided deadline and completion flag', () => {
		const out = buildTaskCreateBody({
			content: 'Follow up',
			deadlineAt: '2026-02-01T00:00:00Z',
			isCompleted: true,
		});
		expect(out.data.deadline_at).toBe('2026-02-01T00:00:00Z');
		expect(out.data.is_completed).toBe(true);
	});

	it('maps a blank deadline to null', () => {
		expect(buildTaskCreateBody({ content: 'x', deadlineAt: '  ' }).data.deadline_at).toBeNull();
	});

	it('maps linked records to target_object/target_record_id', () => {
		const out = buildTaskCreateBody({
			content: 'x',
			linkedRecords: [{ object: 'companies', recordId: 'rec_1' }],
		});
		expect(out.data.linked_records).toEqual([
			{ target_object: 'companies', target_record_id: 'rec_1' },
		]);
	});

	it('drops linked records missing an object or record ID', () => {
		const out = buildTaskCreateBody({
			content: 'x',
			linkedRecords: [
				{ object: '', recordId: 'rec_1' },
				{ object: 'people', recordId: '' },
				{ object: 'companies', recordId: 'rec_2' },
			],
		});
		expect(out.data.linked_records).toEqual([
			{ target_object: 'companies', target_record_id: 'rec_2' },
		]);
	});

	it('maps an email assignee to workspace_member_email_address', () => {
		const out = buildTaskCreateBody({ content: 'x', assignees: [{ email: 'a@b.com' }] });
		expect(out.data.assignees).toEqual([{ workspace_member_email_address: 'a@b.com' }]);
	});

	it('maps a member-id assignee to the referenced actor shape', () => {
		const out = buildTaskCreateBody({ content: 'x', assignees: [{ referencedActorId: 'wm_1' }] });
		expect(out.data.assignees).toEqual([
			{ referenced_actor_type: 'workspace-member', referenced_actor_id: 'wm_1' },
		]);
	});

	it('drops assignees that have neither an email nor a member ID', () => {
		const out = buildTaskCreateBody({
			content: 'x',
			assignees: [{ email: '' }, { referencedActorId: 'wm_2' }],
		});
		expect(out.data.assignees).toEqual([
			{ referenced_actor_type: 'workspace-member', referenced_actor_id: 'wm_2' },
		]);
	});

	it('trims the content', () => {
		expect(buildTaskCreateBody({ content: '  hi  ' }).data.content).toBe('hi');
	});

	it('throws when the content is empty', () => {
		expect(() => buildTaskCreateBody({ content: '   ' })).toThrow(/content/i);
	});
});
