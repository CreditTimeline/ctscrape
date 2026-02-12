/**
 * HTML capture and SHA-256 hashing utilities for provenance tracking (AD-009).
 * Runs in content script context — uses crypto.subtle (MV3 CSP-safe).
 */

/** Capture outerHTML from an element with <script> tags stripped */
export function captureHtml(root: Element): string {
  const clone = root.cloneNode(true) as Element;
  for (const script of clone.querySelectorAll('script')) {
    script.remove();
  }
  return clone.outerHTML;
}

/** Compute SHA-256 hex digest of a string using crypto.subtle */
export async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Capture HTML and compute its SHA-256 hash in one call */
export async function captureWithHash(root: Element): Promise<{ html: string; hash: string }> {
  const html = captureHtml(root);
  const hash = await sha256(html);
  return { html, hash };
}
