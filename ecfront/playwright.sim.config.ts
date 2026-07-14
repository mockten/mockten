import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  testDir: '../mysql/seeder',
  testMatch: '**/*.ts',
});
