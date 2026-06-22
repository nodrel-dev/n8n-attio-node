/** Jest config — pure-core unit tests under test/ (no n8n runtime imports). */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/test'],
	testMatch: ['**/*.test.ts'],
	clearMocks: true,
	transform: {
		'^.+\\.ts$': ['ts-jest', { tsconfig: { strict: true, esModuleInterop: true } }],
	},
};
