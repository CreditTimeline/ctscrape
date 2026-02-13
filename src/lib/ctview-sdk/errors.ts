export class CtviewApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Array<{ path?: string; message: string }>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Array<{ path?: string; message: string }>,
  ) {
    super(message);
    this.name = 'CtviewApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
