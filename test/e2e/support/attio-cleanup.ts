/**
 * Direct Attio API access used only for teardown.
 *
 * Records created through the editor during a test are deleted here rather than
 * through the node, so cleanup does not depend on the thing under test.
 */

const API = 'https://api.attio.com/v2';

function authHeaders(): Record<string, string> {
	const token = process.env.ATTIO_API_TOKEN_FULL;
	if (!token) throw new Error('ATTIO_API_TOKEN_FULL is required for e2e teardown');
	return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

/** Deletes every People record carrying `email`. Safe to call when none exist. */
export async function deletePeopleByEmail(email: string): Promise<number> {
	const query = await fetch(`${API}/objects/people/records/query`, {
		method: 'POST',
		headers: authHeaders(),
		body: JSON.stringify({ filter: { email_addresses: email }, limit: 50 }),
	});
	if (!query.ok) return 0;

	const found = (await query.json()).data ?? [];
	let deleted = 0;

	for (const record of found) {
		const id = record?.id?.record_id;
		if (!id) continue;
		const response = await fetch(`${API}/objects/people/records/${id}`, {
			method: 'DELETE',
			headers: authHeaders(),
		});
		if (response.ok) deleted += 1;
	}

	return deleted;
}
