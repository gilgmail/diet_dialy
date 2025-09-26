const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock UUID as a static string for tests
    '^uuid$': '<rootDir>/src/__mocks__/uuid.js',
    // Mock Google Sheets service
    '^@/lib/google/sheets-service$': '<rootDir>/src/__mocks__/google-sheets-service.ts',
    // Mock Offline Storage service
    '^@/lib/offline-storage$': '<rootDir>/src/__mocks__/offline-storage.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|recharts|d3-.*|jspdf|html2canvas)/)',
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '!<rootDir>/src/**/__mocks__/**',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/types/**',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/src/__tests__/automated-sync-tests.spec.ts', // Playwright test, not Jest
  ],
  // Add jest environment options for better test handling
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)