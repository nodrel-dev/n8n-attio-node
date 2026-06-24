/**
 * Builds the Attio write bodies for Task **Create** and **Update** (contract §1/§2, data-model §3).
 *
 * Pure + framework-free so they are unit-tested with no n8n runtime. Two functions live in one
 * module on purpose (plan.md / data-model.md §3): they share the linked-record and assignee
 * mappers, and differ mainly in that **Update never touches `content`** — task content is
 * write-once (Principle VI, FR-14).
 *
 * Attio shapes (verified live):
 *   - `format` is hardcoded `plaintext` (no selector).
 *   - Create requires every key present: `deadline_at` (null allowed), `is_completed`,
 *     `linked_records[]`, `assignees[]`.
 *   - `linked_records`: `{ target_object, target_record_id }`.
 *   - `assignees`: `{ workspace_member_email_address }` (simple) resolves server-side to a member,
 *     or `{ referenced_actor_type: 'workspace-member', referenced_actor_id }` (advanced).
 */

export interface TaskLinkedRecord {
	object: string;
	recordId: string;
}

export type TaskAssignee = { email?: string; referencedActorId?: string };

export interface TaskCreateOptions {
	content: string;
	deadlineAt?: string | null;
	isCompleted?: boolean;
	linkedRecords?: TaskLinkedRecord[];
	assignees?: TaskAssignee[];
}

export interface TaskUpdateOptions {
	deadlineAt?: string | null;
	isCompleted?: boolean;
	linkedRecords?: TaskLinkedRecord[];
	assignees?: TaskAssignee[];
}

interface AttioLinkedRecord {
	target_object: string;
	target_record_id: string;
}

type AttioAssignee =
	| { workspace_member_email_address: string }
	| { referenced_actor_type: 'workspace-member'; referenced_actor_id: string };

export interface TaskCreateBody {
	data: {
		content: string;
		format: 'plaintext';
		deadline_at: string | null;
		is_completed: boolean;
		linked_records: AttioLinkedRecord[];
		assignees: AttioAssignee[];
	};
}

export interface TaskUpdateBody {
	data: {
		deadline_at?: string | null;
		is_completed?: boolean;
		linked_records?: AttioLinkedRecord[];
		assignees?: AttioAssignee[];
	};
}

export function buildTaskCreateBody(opts: TaskCreateOptions): TaskCreateBody {
	const content = typeof opts.content === 'string' ? opts.content.trim() : '';
	if (!content) {
		throw new Error('Content is required to create a task.');
	}

	return {
		data: {
			content,
			format: 'plaintext',
			deadline_at: normaliseDeadline(opts.deadlineAt),
			is_completed: opts.isCompleted ?? false,
			linked_records: mapLinkedRecords(opts.linkedRecords),
			assignees: mapAssignees(opts.assignees),
		},
	};
}

export function buildTaskUpdateBody(opts: TaskUpdateOptions): TaskUpdateBody {
	const data: TaskUpdateBody['data'] = {};

	if (opts.deadlineAt !== undefined) {
		data.deadline_at = normaliseDeadline(opts.deadlineAt);
	}
	if (opts.isCompleted !== undefined) {
		data.is_completed = opts.isCompleted;
	}
	if (opts.linkedRecords !== undefined) {
		data.linked_records = mapLinkedRecords(opts.linkedRecords);
	}
	if (opts.assignees !== undefined) {
		data.assignees = mapAssignees(opts.assignees);
	}

	return { data };
}

/** Blank/undefined → null (Attio accepts a null deadline); otherwise the trimmed value. */
function normaliseDeadline(value: string | null | undefined): string | null {
	if (typeof value !== 'string') {
		return null;
	}
	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
}

/** Keeps only rows with both an object and a record ID. */
function mapLinkedRecords(records: TaskLinkedRecord[] | undefined): AttioLinkedRecord[] {
	if (!Array.isArray(records)) {
		return [];
	}
	return records
		.filter((r) => r?.object?.trim() && r?.recordId?.trim())
		.map((r) => ({ target_object: r.object.trim(), target_record_id: r.recordId.trim() }));
}

/** Email assignees take precedence; member-id assignees use the referenced-actor shape. */
function mapAssignees(assignees: TaskAssignee[] | undefined): AttioAssignee[] {
	if (!Array.isArray(assignees)) {
		return [];
	}
	const mapped: AttioAssignee[] = [];
	for (const assignee of assignees) {
		const email = assignee?.email?.trim();
		const actorId = assignee?.referencedActorId?.trim();
		if (email) {
			mapped.push({ workspace_member_email_address: email });
		} else if (actorId) {
			mapped.push({ referenced_actor_type: 'workspace-member', referenced_actor_id: actorId });
		}
	}
	return mapped;
}
