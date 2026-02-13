/**
 * SHA-256 hashing for ArrayBuffer inputs.
 * Used for PDF provenance tracking (AD-009).
 * Reuses the crypto.subtle pattern from html-capture.ts.
 */

/** Compute SHA-256 hex digest of an ArrayBuffer */
export async function sha256Buffer(input: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', input);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
