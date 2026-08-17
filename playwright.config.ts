import { defineConfig } from '@playwright/test';

/**
 * UI-automation config for the Attio node.
 *
 * These specs cover only what driving n8n's REST API cannot reach — `loadOptions`
 * dropdowns, `displayOptions` conditional rendering, the node-creator manifest and
 * NDV error rendering. CRUD coverage lives in the unit suite and the live REST pass.
 *
 * Requires a running n8n with the node mounted, plus Attio tokens in the
 * environment (see test/e2e/README.md).
 */
export default defineConfig({
	testDir: './test/e2e',
	testMatch: '**/*.spec.ts',
	globalSetup: './test/e2e/global-setup.ts',
	// The specs hit the live Attio API; serial keeps request volume predictable
	// and avoids racing on the shared n8n workflow list.
	workers: 1,
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	timeout: 60_000,
	expect: { timeout: 15_000 },
	reporter: process.env.CI ? [['github'], ['list']] : [['list']],
	// n8n annotates its UI with `data-test-id`, not Playwright's default `data-testid`.
	use: {
		testIdAttribute: 'data-test-id',
		baseURL: process.env.N8N_BASE_URL ?? 'http://localhost:5678',
		storageState: './test/e2e/.auth/state.json',
		actionTimeout: 15_000,
		navigationTimeout: 30_000,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	projects: [{ name: 'chromium', use: { channel: 'chromium' } }],
});
