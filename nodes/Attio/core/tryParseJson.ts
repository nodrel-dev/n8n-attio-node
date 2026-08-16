/**
 * Non-throwing JSON parse used by the pure body builders.
 *
 * The builders surface their own field-specific validation message (e.g. "Values must be valid
 * JSON…") rather than the raw `SyntaxError`, so the parse failure is reported as a result rather
 * than thrown. Keeping the failure out of the `catch` clause also satisfies the n8n community-node
 * rule `require-node-api-error`, which forbids re-throwing from a catch in node/helper files —
 * the n8n boundary in `descriptions/shared.ts` is where these become `NodeOperationError`.
 */

export type JsonParseResult = { ok: true; value: unknown } | { ok: false };

export function tryParseJson(raw: string): JsonParseResult {
	try {
		return { ok: true, value: JSON.parse(raw) };
	} catch {
		return { ok: false };
	}
}
