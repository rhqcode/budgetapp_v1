import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: 'index.html',
        'add-transaction': 'add-transaction.html',
        budget: 'budget.html',
        accounts: 'accounts.html',
      }
    }
  }
});
