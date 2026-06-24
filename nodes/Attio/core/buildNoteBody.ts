/**
 * Builds the Attio write body for Note **Create** (`POST /v2/notes`, contract §1, data-model §2).
 *
 * Pure + framework-free so it is unit-tested with no n8n runtime. The node collects the
 * Parent Object / Parent Record ID / Title / Format / Content (+ optional created_at, meeting_id)
 * params and gets back the Attio envelope `{ data: { ... } }`.
 *
 * Required fields fail fast with a clear, user-facing message (FR-5): a missing parent link,
 * title, or content is rejected before any request is made.
 */

export type NoteFormat = 'plaintext' | 'markdown';

export interface NoteBodyInput {
	parentObject: string;
	parentRecordId: string;
	title: string;
	content: string;
	format?: NoteFormat;
	createdAt?: string;
	meetingId?: string;
}

export interface AttioNoteBody {
	data: {
		parent_object: string;
		parent_record_id: string;
		title: string;
		format: NoteFormat;
		content: string;
		created_at?: string;
		meeting_id?: string;
	};
}

export function buildNoteBody(input: NoteBodyInput): AttioNoteBody {
	const parentObject = requireField(input.parentObject, 'Parent Object');
	const parentRecordId = requireField(input.parentRecordId, 'Parent Record ID');
	const title = requireField(input.title, 'Title');
	const content = requireField(input.content, 'Content');

	const data: AttioNoteBody['data'] = {
		parent_object: parentObject,
		parent_record_id: parentRecordId,
		title,
		format: input.format ?? 'plaintext',
		content,
	};

	const createdAt = optionalField(input.createdAt);
	if (createdAt) {
		data.created_at = createdAt;
	}
	const meetingId = optionalField(input.meetingId);
	if (meetingId) {
		data.meeting_id = meetingId;
	}

	return { data };
}

/** Trims and requires a non-empty string, else throws a clear field-named error. */
function requireField(value: unknown, label: string): string {
	const trimmed = typeof value === 'string' ? value.trim() : '';
	if (!trimmed) {
		throw new Error(`${label} is required to create a note.`);
	}
	return trimmed;
}

/** Trims an optional string; blank → undefined (omitted from the body). */
function optionalField(value: unknown): string | undefined {
	const trimmed = typeof value === 'string' ? value.trim() : '';
	return trimmed || undefined;
}
