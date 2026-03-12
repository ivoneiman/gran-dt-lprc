import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  /* Puedes habilitar los navegadores que necesites */
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' },
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit' },
    },
  ],
  /* Si tu app necesita datos de entorno, ponlos aquí */
  use: {
    baseURL: 'http://localhost:3000',
    /* Si tu app necesita autenticación, puedes usar fixtures */
  },
});