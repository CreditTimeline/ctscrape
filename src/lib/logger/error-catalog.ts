interface ErrorInfo {
  title: string;
  description: string;
  troubleshooting: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
}

const catalog: Record<string, ErrorInfo> = {
  NETWORK_ERROR: {
    title: 'Network Error',
    description: 'Could not connect to the ctview server. The server may be offline or unreachable.',
    troubleshooting: [
      'Check your internet connection.',
      'Verify the server URL in Connection Settings.',
      'Ensure the ctview server is running.',
    ],
    severity: 'high',
    retryable: true,
  },
  UNAUTHORIZED: {
    title: 'Unauthorized',
    description: 'The API key was rejected by the ctview server.',
    troubleshooting: [
      'Check that the API key in Connection Settings is correct.',
      'Generate a new API key in ctview if needed.',
    ],
    severity: 'high',
    retryable: false,
  },
  FORBIDDEN: {
    title: 'Forbidden',
    description: 'Your account does not have permission to perform this action.',
    troubleshooting: [
      'Verify your API key has the correct permissions.',
      'Contact your ctview administrator for access.',
    ],
    severity: 'high',
    retryable: false,
  },
  VALIDATION_FAILED: {
    title: 'Validation Failed',
    description: 'The extracted data did not pass schema validation.',
    troubleshooting: [
      'Try re-extracting the data from the report page.',
      'Check if the report page has loaded completely.',
      'This may indicate a change in the report format — check for extension updates.',
    ],
    severity: 'medium',
    retryable: false,
  },
  DUPLICATE_IMPORT: {
    title: 'Duplicate Import',
    description: 'This data has already been imported into ctview.',
    troubleshooting: [
      'Check your import history in ctview to confirm.',
      'If this is unexpected, the data may match a previous import.',
    ],
    severity: 'low',
    retryable: false,
  },
  RATE_LIMITED: {
    title: 'Rate Limited',
    description: 'Too many requests have been sent to the ctview server.',
    troubleshooting: [
      'Wait a few minutes before trying again.',
      'The request will be retried automatically.',
    ],
    severity: 'medium',
    retryable: true,
  },
  NOT_READY: {
    title: 'Not Ready',
    description: 'The ctview server is not ready to accept requests.',
    troubleshooting: [
      'The server may be starting up. Wait a moment and try again.',
      'Check the ctview server status.',
    ],
    severity: 'medium',
    retryable: true,
  },
  EXTRACTION_FAILED: {
    title: 'Extraction Failed',
    description: 'Could not extract data from the report page.',
    troubleshooting: [
      'Make sure you are on a supported report page.',
      'Ensure the page has fully loaded before extracting.',
      'Try refreshing the page and extracting again.',
    ],
    severity: 'high',
    retryable: false,
  },
  NORMALISATION_FAILED: {
    title: 'Normalisation Failed',
    description: 'The extracted data could not be converted to the expected format.',
    troubleshooting: [
      'Try re-extracting the data.',
      'This may indicate a change in the report format — check for extension updates.',
    ],
    severity: 'high',
    retryable: false,
  },
  NO_TAB: {
    title: 'No Active Tab',
    description: 'No active browser tab was found to perform the operation.',
    troubleshooting: [
      'Make sure a browser tab is active.',
      'Try clicking on the tab with the report page.',
    ],
    severity: 'low',
    retryable: false,
  },
  NO_DATA: {
    title: 'No Data Available',
    description: 'There is no normalised data available to send.',
    troubleshooting: [
      'Extract data from a report page first.',
      'Check that extraction completed successfully.',
    ],
    severity: 'low',
    retryable: false,
  },
  NOT_CONFIGURED: {
    title: 'Not Configured',
    description: 'The ctview connection has not been configured.',
    troubleshooting: [
      'Enter a server URL and API key in Connection Settings.',
      'Test the connection to verify it works.',
    ],
    severity: 'medium',
    retryable: false,
  },
  UNKNOWN: {
    title: 'Unknown Error',
    description: 'An unexpected error occurred.',
    troubleshooting: [
      'Try the operation again.',
      'Check the diagnostic log for more details.',
      'If the problem persists, export the diagnostic log and report the issue.',
    ],
    severity: 'high',
    retryable: false,
  },
};

export function getErrorInfo(errorCode: string): ErrorInfo | null {
  return catalog[errorCode] ?? null;
}
