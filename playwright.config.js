const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: 'tests',
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:4180' },
  webServer: { command: 'node tests/server.js 4180', url: 'http://localhost:4180/', reuseExistingServer: !process.env.CI },
});
