import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { mapObjectsToOptions, type AttioObject } from '../core/mapObjectsToOptions';

/**
 * `getObjects` — the node's single programmatic surface (Principle II/XI, research.md R7).
 *
 * Populates the Object dropdown (and Search `objects` multiOptions) from the user's own
 * workspace by calling `GET /v2/objects` against the `attioApi` credential. The pure
 * `mapObjectsToOptions` does the shaping (name = plural ?? singular ?? slug; value = slug).
 * No caching — this runs at design time. Programmatic loadOptions is sanctioned and does
 * NOT count as a runtime dependency.
 *
 * Requires `object_configuration:read`; a 403 here means the token lacks that scope.
 */
export async function getObjects(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'attioApi', {
		method: 'GET',
		baseURL: 'https://api.attio.com',
		url: '/v2/objects',
		json: true,
	})) as { data?: AttioObject[] };

	const objects = response.data ?? [];
	return mapObjectsToOptions(objects);
}
