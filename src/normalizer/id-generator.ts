/** FNV-1a 32-bit hash → 8 hex chars */
export function deterministicHash(input: string): string {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV prime
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Generate a deterministic ID from prefix and key parts */
export function generateId(prefix: string, ...parts: string[]): string {
  const input = parts.join('|');
  const hash = deterministicHash(input);
  return `${prefix}:${hash}`;
}

/** Generate a sequential ID with prefix and counter */
export function generateSequentialId(prefix: string, counter: number): string {
  return `${prefix}:${counter}`;
}
