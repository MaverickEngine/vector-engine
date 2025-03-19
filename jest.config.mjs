// ESM Jest configuration
export default {
    verbose: true,
    testEnvironment: 'node',
    transform: {
        '^.+\\.[t|j]sx?$': ['babel-jest', { configFile: './babel.config.cjs' }]
    },
    transformIgnorePatterns: [],
    testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/dist/',
        '<rootDir>/env/',
        '<rootDir>/.venv/',
        '<rootDir>/article/'
    ],
    setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
    testTimeout: 10000,
    // Only specify non-js extensions as ESM since package.json already sets .js files as ESM
    extensionsToTreatAsEsm: ['.jsx', '.ts', '.tsx'],
    // Help with the mock API server
    testEnvironmentOptions: {
        url: "http://localhost:3000"
    }
}; 