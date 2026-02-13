import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'ctscrape — Credit Report Scraper',
    description: 'Scrape credit report data and send it to ctview for storage and analysis',
    permissions: ['storage', 'activeTab', 'sidePanel', 'alarms'],
    host_permissions: ['*://*.checkmyfile.com/*'],
    optional_host_permissions: ['*://*/*'],
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
  vite: async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugins: any[] = [];

    // Faro source map upload — only in CI when all env vars are set
    const faroApiKey = process.env.FARO_API_KEY;
    const faroAppId = process.env.FARO_APP_ID;
    const faroStackId = process.env.FARO_STACK_ID;
    const faroEndpoint = process.env.FARO_SOURCE_MAP_ENDPOINT;

    if (faroApiKey && faroAppId && faroStackId && faroEndpoint) {
      const { default: faroUploader } = await import('@grafana/faro-rollup-plugin');
      plugins.push(
        faroUploader({
          appName: 'ctscrape',
          appId: faroAppId,
          endpoint: faroEndpoint,
          apiKey: faroApiKey,
          stackId: faroStackId,
          gzipContents: true,
          keepSourcemaps: false,
          verbose: true,
        }),
      );
    }

    return {
      define: {
        __GA4_MEASUREMENT_ID__: JSON.stringify(process.env.GA4_MEASUREMENT_ID ?? ''),
        __GA4_API_SECRET__: JSON.stringify(process.env.GA4_API_SECRET ?? ''),
      },
      plugins,
      build: {
        sourcemap: !!faroApiKey,
      },
    };
  },
});
