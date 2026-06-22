/**
 * Shared declarative routing fragments used by every operation (T019/T020).
 *
 * Response handling is uniform across the node:
 *   - Errors: the node sets `ignoreHttpStatusErrors: true` in `requestDefaults`, so non-2xx
 *     responses flow into `postReceive`. `makeAttioErrorPostReceive` inspects the status and
 *     throws a NodeApiError carrying `formatAttioError`'s message (403 scope hint, 429 date, etc.).
 *     It must be the FIRST postReceive action on every operation.
 *   - Success unwrap: `unwrapData` lifts the top-level `data` key into n8n items (one per array
 *     element for lists, one for single-object responses).
 *   - DELETE: `makeDeleteSuccess` synthesises `{ success: true, <idKey>: <id> }` (no meaningful body).
 *
 * `continueOnFail` needs no wiring here — n8n's routing engine already runs each input item
 * independently and routes a thrown error to the node's "Continue On Fail" output when enabled.
 */
import type {
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	JsonObject,
	PostReceiveAction,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { formatAttioError, type AttioErrorEnvelope } from '../core/formatAttioError';

/** Lifts the top-level `data` property into items (n8n splits arrays into one item each). */
export const unwrapData = {
	type: 'rootProperty' as const,
	properties: { property: 'data' },
};

/**
 * Builds the error-handling postReceive for an operation. Supply the operation's required
 * scopes so a 403 names them. Place this FIRST in the operation's `postReceive` array.
 */
export function makeAttioErrorPostReceive(requiredScopes?: string[]): PostReceiveAction {
	return async function attioErrorPostReceive(
		this: IExecuteSingleFunctions,
		items: INodeExecutionData[],
		response: IN8nHttpFullResponse,
	): Promise<INodeExecutionData[]> {
		const status = response.statusCode;
		if (status < 400) {
			return items;
		}

		const body = (response.body ?? {}) as AttioErrorEnvelope;
		const retryAfter = readHeader(response.headers, 'retry-after');
		const message = formatAttioError(status, body, { requiredScopes, retryAfter });

		throw new NodeApiError(this.getNode(), (body as unknown as JsonObject) ?? {}, {
			message,
			httpCode: String(status),
		});
	};
}

/**
 * Builds a postReceive that discards the (empty) DELETE body and returns a success indicator.
 * `jsonKey` is the response field (e.g. `record_id`); `paramName` is the n8n parameter to read it from.
 */
export function makeDeleteSuccess(jsonKey: string, paramName: string): PostReceiveAction {
	// Signature is narrower than PostReceiveAction on purpose: the DELETE body is empty, so
	// neither the incoming items nor the response are needed (TS allows the assignment).
	return async function deleteSuccessPostReceive(
		this: IExecuteSingleFunctions,
	): Promise<INodeExecutionData[]> {
		const id = this.getNodeParameter(paramName, '') as string;
		return [{ json: { success: true, [jsonKey]: id } }];
	};
}

function readHeader(
	headers: IN8nHttpFullResponse['headers'],
	name: string,
): string | undefined {
	if (!headers) {
		return undefined;
	}
	const bag = headers as Record<string, unknown>;
	const value = bag[name] ?? bag[name.toLowerCase()];
	if (Array.isArray(value)) {
		return value[0] as string | undefined;
	}
	return value as string | undefined;
}
