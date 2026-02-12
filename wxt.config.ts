import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'ctscrape — Credit Report Scraper',
    description: 'Scrape credit report data and send it to ctview for storage and analysis',
    permissions: ['storage', 'activeTab', 'sidePanel'],
    host_permissions: ['*://*.checkmyfile.com/*'],
  },
  runner: {
    startUrls: ['https://www.checkmyfile.com/'],
  },
});
