export interface ParsedAddress {
  line_1: string;
  line_2?: string;
  town_city?: string;
  postcode?: string;
  country_code: string;
  normalized_single_line: string;
}

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export function parseUkAddress(raw: string): ParsedAddress {
  const parts = raw.split(',').map(p => p.trim()).filter(Boolean);

  let postcode: string | undefined;
  let postcodeIndex = -1;

  // Find postcode (usually last or second-to-last part)
  for (let i = parts.length - 1; i >= 0; i--) {
    if (UK_POSTCODE_RE.test(parts[i]!)) {
      const raw = parts[i]!.toUpperCase().replace(/\s+/g, '');
      // Insert space before the inward code (last 3 chars)
      postcode = raw.slice(0, -3) + ' ' + raw.slice(-3);
      postcodeIndex = i;
      break;
    }
  }

  let townCity: string | undefined;
  const addressParts: string[] = [];

  if (postcodeIndex > 0) {
    townCity = parts[postcodeIndex - 1];
    addressParts.push(...parts.slice(0, postcodeIndex - 1));
  } else if (postcodeIndex === 0) {
    // Edge case: only postcode
    addressParts.push(...parts.slice(1));
  } else {
    // No postcode found — last part might be town
    if (parts.length > 1) {
      townCity = parts[parts.length - 1];
      addressParts.push(...parts.slice(0, parts.length - 1));
    } else {
      addressParts.push(...parts);
    }
  }

  const line_1 = addressParts[0] || raw;
  const line_2 = addressParts.length > 1 ? addressParts.slice(1).join(', ') : undefined;

  const normalizedParts = [line_1, line_2, townCity, postcode].filter(Boolean);
  const normalized_single_line = normalizedParts.join(', ').toUpperCase().replace(/\s+/g, ' ');

  return {
    line_1,
    ...(line_2 && { line_2 }),
    ...(townCity && { town_city: townCity }),
    ...(postcode && { postcode }),
    country_code: 'GB',
    normalized_single_line,
  };
}
