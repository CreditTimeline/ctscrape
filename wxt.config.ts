import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'ctscrape — Credit Report Scraper',
    description: 'Scrape credit report data and send it to ctview for storage and analysis',
    permissions: ['storage', 'activeTab', 'sidePanel'],
    host_permissions: ['*://*.checkmyfile.com/*'],
    icons: {
      16: 'icon/icon-16.png',
      32: 'icon/icon-32.png',
      48: 'icon/icon-48.png',
      128: 'icon/icon-128.png',
    },
  },
  runner: {
    startUrls: ['https://www.checkmyfile.com/'],
  },
});
