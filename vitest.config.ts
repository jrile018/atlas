import { defineConfig } from 'vitest/config';

const configuredMinimum = Number.parseFloat(process.env.COVERAGE_MIN ?? '50');
const coverageMinimum = Number.isFinite(configuredMinimum) ? configuredMinimum : 50;

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/model.ts', 'src/operations.ts'],
      thresholds: {
        lines: coverageMinimum,
        functions: coverageMinimum,
        branches: coverageMinimum,
        statements: coverageMinimum,
      },
    },
  },
});
