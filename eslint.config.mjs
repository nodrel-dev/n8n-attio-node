// ESLint flat config for the Attio community node.
// Re-exports @n8n/node-cli's config, which bundles the eslint-plugin-n8n-nodes-base
// community-node rules (display names, descriptions, option ordering, etc.) under ESLint 9.
import { config } from '@n8n/node-cli/eslint';

export default [
	...config,
	{
		// The UI-automation suite is tooling, not shipped node code — `files: ["dist"]`
		// keeps it out of the published package, and the community scan only ever reads
		// dist. n8n's Cloud rules (no dependencies, no `process`, no `node:fs`) are
		// correct for the node and impossible for Playwright, which needs all three.
		// Scoped to these paths so `credentials/` and `nodes/` keep full coverage.
		ignores: ['playwright.config.ts', 'test/e2e/**'],
	},
];
