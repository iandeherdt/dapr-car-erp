/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'CommonJS',
        moduleResolution: 'Node',
        isolatedModules: true,
      },
    }],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
};
