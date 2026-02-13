import type { NormalisationContext } from '../context';
import { nextCounter, getImportId, registerOrganisation, registerAddress } from '../context';
import { generateId, generateSequentialId } from '../id-generator';
import { groupFieldsByGroupKey } from '../field-grouper';
import { mapCheckMyFileSearchType } from '../mappers/search-type';
import { parseUkAddress } from '../mappers/address-parser';
import { parseSlashDate } from '@/utils/parsers';
import type { RawSection } from '@/adapters/types';
import type { Address } from '../credit-file.types';

export function normaliseSearches(ctx: NormalisationContext, sections: RawSection[]): void {
  const groups = groupFieldsByGroupKey(sections, 'searches');

  for (const [groupKey, group] of groups) {
    const importId = getImportId(ctx, group.sourceSystem);

    // Determine hard/soft from groupKey
    const isHard = groupKey.toLowerCase().includes('hard');
    const sectionType: 'hard' | 'soft' = isHard ? 'hard' : 'soft';
    const { searchType, visibility, warning } = mapCheckMyFileSearchType(sectionType);
    if (warning) ctx.warnings.push(warning);

    // Parse date
    const dateField = group.fields.get('date');
    let searchedAt: string | undefined;
    if (dateField) {
      searchedAt = parseSlashDate(dateField.value) ?? undefined;
    }

    // Register organisation
    const companyField = group.fields.get('companyName') ?? group.fields.get('company');
    let orgId: string | undefined;
    let orgNameRaw: string | undefined;
    if (companyField) {
      orgNameRaw = companyField.value;
      orgId = registerOrganisation(ctx, companyField.value, 'searcher', importId);
    }

    // Input name
    const nameField = group.fields.get('name');
    const inputName = nameField?.value;

    // Input address
    const addressField = group.fields.get('address');
    let inputAddressId: string | undefined;
    if (addressField) {
      const parsed = parseUkAddress(addressField.value);
      const addrId = generateId('addr', parsed.normalized_single_line);
      const address: Address = {
        address_id: addrId,
        line_1: parsed.line_1,
        ...(parsed.line_2 && { line_2: parsed.line_2 }),
        ...(parsed.town_city && { town_city: parsed.town_city }),
        ...(parsed.postcode && { postcode: parsed.postcode }),
        country_code: parsed.country_code,
        normalized_single_line: parsed.normalized_single_line,
      };
      inputAddressId = registerAddress(ctx, address);

      // Create association with search_input role
      const assocId = generateSequentialId('addr-assoc', nextCounter(ctx, 'addr-assoc'));
      ctx.addressAssociations.push({
        association_id: assocId,
        address_id: inputAddressId,
        role: 'search_input',
        source_import_id: importId,
      });
    }

    const searchId = generateSequentialId('search', nextCounter(ctx, 'search'));
    ctx.searches.push({
      search_id: searchId,
      ...(searchedAt && { searched_at: searchedAt }),
      ...(orgId && { organisation_id: orgId }),
      ...(orgNameRaw && { organisation_name_raw: orgNameRaw }),
      search_type: searchType,
      visibility,
      ...(inputName && { input_name: inputName }),
      ...(inputAddressId && { input_address_id: inputAddressId }),
      source_import_id: importId,
    });
  }
}
