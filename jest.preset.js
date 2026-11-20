module.exports = {
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  moduleFileExtensions: ['ts', 'js', 'mjs', 'html'],
  coverageReporters: ['html'],
  testEnvironment: 'jsdom',
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/out-tsc/'],
  testEnvironmentOptions: {},
};
