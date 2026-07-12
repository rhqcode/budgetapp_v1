import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  build: {
    rollupOptions: {
      input: {
        index: 'index.html',
        'add-transaction': 'add-transaction.html',
        budget: 'budget.html',
        accounts: 'accounts.html',
        instructions: 'instructions.html',
      }
    }
  }
});
