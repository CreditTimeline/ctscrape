import { registerAdapter } from '../registry';
import type { SiteAdapter, DataDomain } from '../types';
import { detect, getPageInfo } from './detector';
import { extract } from './extractor';

const checkmyfileAdapter: SiteAdapter = {
  id: 'checkmyfile',
  name: 'CheckMyFile',
  version: '0.1.0',
  matchPatterns: ['*://*.checkmyfile.com/*'],

  detect(document: Document): boolean {
    return detect(document);
  },

  getPageInfo(document: Document) {
    return getPageInfo(document);
  },

  async extract(document: Document) {
    return extract(document, this.id, this.version);
  },

  getSupportedSections(): DataDomain[] {
    return [
      'personal_info',
      'addresses',
      'tradelines',
      'searches',
      'credit_scores',
      'electoral_roll',
      'financial_associates',
    ];
  },
};

registerAdapter(checkmyfileAdapter);

export default checkmyfileAdapter;
