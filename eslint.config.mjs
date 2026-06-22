// ESLint flat config for the Attio community node.
// Re-exports @n8n/node-cli's config, which bundles the eslint-plugin-n8n-nodes-base
// community-node rules (display names, descriptions, option ordering, etc.) under ESLint 9.
import { config } from '@n8n/node-cli/eslint';

export default config;
