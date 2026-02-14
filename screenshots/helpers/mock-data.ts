/**
 * Self-contained mock data for screenshot generation.
 * Values mirror src/__tests__/fixtures/mock-status.ts and src/__tests__/helpers/factories.ts
 * but without imports from src/ (runs outside WXT build context).
 */

export const MOCK_CONNECTION_SETTINGS = {
  serverUrl: 'https://ctview.example.com',
  apiKey: 'ct_live_k8xP2mN9vQw3rT7y',
};

export const MOCK_PAGE_INFO = {
  siteName: 'CheckMyFile',
  subjectName: 'John Smith',
  reportDate: '2024-01-15',
  providers: ['Equifax', 'Experian', 'TransUnion'],
};

export const MOCK_SUMMARY = {
  personNames: 2,
  addresses: 3,
  tradelines: 12,
  searches: 5,
  creditScores: 3,
  publicRecords: 0,
  electoralRollEntries: 2,
  financialAssociates: 1,
  fraudMarkers: 0,
  noticesOfCorrection: 0,
};

export const MOCK_SUCCESS_RESULT = {
  success: true,
  creditFile: null,
  errors: [],
  warnings: [
    { domain: 'tradelines', field: 'balance', message: 'Balance is zero on 2 accounts', severity: 'info' },
    { domain: 'addresses', message: 'Address format may be incomplete', severity: 'warning' },
  ],
  summary: MOCK_SUMMARY,
};

export const MOCK_SEND_RESULT = {
  success: true,
  receiptId: 'imp_a1b2c3d4',
  importIds: ['imp_a1b2c3d4'],
};

export const MOCK_HISTORY_ENTRIES = [
  {
    id: 'hist-1',
    adapterId: 'checkmyfile',
    siteName: 'CheckMyFile',
    extractedAt: '2025-06-15T10:30:00.000Z',
    sentAt: '2025-06-15T10:31:00.000Z',
    status: 'sent',
    entityCounts: { tradelines: 12, addresses: 3, creditScores: 3, searches: 5 },
    receiptId: 'imp_a1b2c3d4',
    error: null,
  },
  {
    id: 'hist-2',
    adapterId: 'checkmyfile',
    siteName: 'CheckMyFile',
    extractedAt: '2025-05-01T14:20:00.000Z',
    sentAt: '2025-05-01T14:21:00.000Z',
    status: 'sent',
    entityCounts: { tradelines: 10, addresses: 2, creditScores: 3, searches: 4 },
    receiptId: 'imp_e5f6g7h8',
    error: null,
  },
  {
    id: 'hist-3',
    adapterId: 'checkmyfile',
    siteName: 'CheckMyFile',
    extractedAt: '2025-04-10T09:15:00.000Z',
    sentAt: null,
    status: 'pending',
    entityCounts: { tradelines: 11, addresses: 3, creditScores: 3, searches: 6 },
    receiptId: null,
    error: null,
  },
  {
    id: 'hist-4',
    adapterId: 'checkmyfile',
    siteName: 'CheckMyFile',
    extractedAt: '2025-03-20T16:45:00.000Z',
    sentAt: null,
    status: 'failed',
    entityCounts: { tradelines: 8, addresses: 2, creditScores: 3, searches: 3 },
    receiptId: null,
    error: 'Connection refused: ECONNREFUSED',
  },
];
