import type { NormalisationContext } from '../context';
import { nextCounter, getImportId, registerAddress } from '../context';
import { generateId, generateSequentialId } from '../id-generator';
import { groupFieldsByGroupKey } from '../field-grouper';
import { parseUkAddress } from '../mappers/address-parser';
import { mapAddressRole } from '../mappers/address-role';
import type { RawSection } from '@/adapters/types';
import type { Address } from '../credit-file.types';

export function normaliseAddresses(ctx: NormalisationContext, sections: RawSection[]): void {
  const groups = groupFieldsByGroupKey(sections, 'addresses');
  let tableIndex = 0;

  for (const [groupKey, group] of groups) {
    const addressField = group.fields.get('address');
    if (!addressField) continue;

    const parsed = parseUkAddress(addressField.value);
    const addressId = generateId('addr', parsed.normalized_single_line);

    const address: Address = {
      address_id: addressId,
      line_1: parsed.line_1,
      ...(parsed.line_2 && { line_2: parsed.line_2 }),
      ...(parsed.town_city && { town_city: parsed.town_city }),
      ...(parsed.postcode && { postcode: parsed.postcode }),
      country_code: parsed.country_code,
      normalized_single_line: parsed.normalized_single_line,
    };

    const registeredId = registerAddress(ctx, address);

    // Create association for this observation
    const sourceSystem = group.sourceSystem ?? '';
    const role = mapAddressRole(groupKey, sourceSystem.toLowerCase(), tableIndex);
    const assocId = generateSequentialId('addr-assoc', nextCounter(ctx, 'addr-assoc'));

    ctx.addressAssociations.push({
      association_id: assocId,
      address_id: registeredId,
      role,
      source_import_id: getImportId(ctx, group.sourceSystem),
    });

    // Handle linked-address fields
    const linkedField = group.fields.get('linked-address');
    if (linkedField) {
      const linkedParsed = parseUkAddress(linkedField.value);
      const linkedAddrId = generateId('addr', linkedParsed.normalized_single_line);

      const linkedAddress: Address = {
        address_id: linkedAddrId,
        line_1: linkedParsed.line_1,
        ...(linkedParsed.line_2 && { line_2: linkedParsed.line_2 }),
        ...(linkedParsed.town_city && { town_city: linkedParsed.town_city }),
        ...(linkedParsed.postcode && { postcode: linkedParsed.postcode }),
        country_code: linkedParsed.country_code,
        normalized_single_line: linkedParsed.normalized_single_line,
      };

      const registeredLinkedId = registerAddress(ctx, linkedAddress);

      const linkId = generateSequentialId('addr-link', nextCounter(ctx, 'addr-link'));
      ctx.addressLinks.push({
        address_link_id: linkId,
        from_address_id: registeredId,
        to_address_id: registeredLinkedId,
        source_import_id: getImportId(ctx, group.sourceSystem),
      });
    }

    tableIndex++;
  }
}
