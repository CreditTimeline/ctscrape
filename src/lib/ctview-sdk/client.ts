import type { CtviewClientOptions, IngestResult, SystemHealth } from './types';
import { apiFetch, type FetchOptions } from './fetch-wrapper';

export class CtviewClient {
  private readonly options: FetchOptions;

  constructor(options: CtviewClientOptions) {
    let baseUrl = options.baseUrl.replace(/\/$/, '');
    if (!baseUrl.endsWith('/api/v1')) {
      baseUrl += '/api/v1';
    }
    this.options = { ...options, baseUrl: baseUrl + '/' };
  }

  async getHealth(): Promise<SystemHealth> {
    return apiFetch(this.options, 'settings/health');
  }

  async checkReady(): Promise<{ status: string }> {
    return apiFetch(this.options, 'ready');
  }

  async ingest(body: unknown): Promise<IngestResult> {
    return apiFetch(this.options, 'ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
}
