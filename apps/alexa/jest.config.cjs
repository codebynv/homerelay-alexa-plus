module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: { '^(.+)\\.js$': '$1' },
  globals: { 'ts-jest': { useESM: true } },
  transform: { '^.+\\.ts$': ['ts-jest', { useESM: true }] }
};
