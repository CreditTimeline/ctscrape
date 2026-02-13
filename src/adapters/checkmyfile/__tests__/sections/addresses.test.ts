// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { extractAddresses } from '../../sections/addresses';
import type { ClassifiedSection } from '../../section-classifier';
import {
  createSection,
  createCraTableRow,
  createCraHeaderRow,
  randomAddress,
  randomName,
} from '../fixtures/helpers';
import { SELECTORS, NO_DATA_SENTINEL } from '../../constants';

function buildAddressTable(
  heading: string,
  craData: {
    Experian?: Record<string, string>;
    Equifax?: Record<string, string>;
    TransUnion?: Record<string, string>;
  },
): HTMLElement {
  const wrapper = document.createElement('div');

  const h2 = document.createElement('h2');
  h2.setAttribute('data-testid', SELECTORS.ADDRESSES_TABLE_HEADING);
  h2.textContent = heading;
  wrapper.appendChild(h2);

  const table = document.createElement('table');
  table.setAttribute('data-testid', SELECTORS.ADDRESSES_TABLE);

  const thead = document.createElement('thead');
  thead.appendChild(createCraHeaderRow());
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  const fieldSlugs = ['address', 'name', 'electoral-roll', 'marketing-status', 'linked-address'];
  const fieldLabels = ['Address', 'Name', 'Electoral Roll', 'Marketing Status', 'Linked Address'];

  for (let i = 0; i < fieldSlugs.length; i++) {
    const slug = fieldSlugs[i]!;
    const label = fieldLabels[i]!;
    const values: Record<string, string> = {};
    for (const cra of ['Experian', 'Equifax', 'TransUnion'] as const) {
      const data = craData[cra];
      if (data && slug in data) {
        values[cra] = data[slug]!;
      }
    }
    tbody.appendChild(createCraTableRow(slug, label, values));
  }

  table.appendChild(tbody);
  wrapper.appendChild(table);
  return wrapper;
}



describe('extractAddresses', () => {
  it('extracts address and electoral roll data from all CRAs', () => {
    const addr1 = randomAddress();
    const addr2 = randomAddress();
    const addr3 = randomAddress();
    const name1 = randomName();
    const name2 = randomName();
    const name3 = randomName();

    const tableEl = buildAddressTable('Current Address', {
      Experian: {
        address: addr1,
        name: name1,
        'electoral-roll': 'Registered',
        'marketing-status': 'Opted out',
        'linked-address': 'None',
      },
      Equifax: {
        address: addr2,
        name: name2,
        'electoral-roll': 'Not registered',
        'marketing-status': 'Active',
      },
      TransUnion: {
        address: addr3,
        name: name3,
      },
    });

    const section = createSection({
      heading: 'Addresses & Electoral Roll',
      content: tableEl.outerHTML,
    });
    document.body.appendChild(section);
    const classified: ClassifiedSection = { type: 'addresses', element: section, index: 0 };

    const result = extractAddresses([classified]);

    // Experian: address + electoral
    const expAddr = result.find(
      (r) => r.domain === 'addresses' && r.sourceSystem === 'Experian',
    );
    expect(expAddr).toBeDefined();
    expect(expAddr!.fields.find((f) => f.name === 'address')!.value).toBe(addr1);
    expect(expAddr!.fields.find((f) => f.name === 'name')!.value).toBe(name1);
    expect(expAddr!.fields.find((f) => f.name === 'heading')!.value).toBe('Current Address');

    const expElectoral = result.find(
      (r) => r.domain === 'electoral_roll' && r.sourceSystem === 'Experian',
    );
    expect(expElectoral).toBeDefined();
    expect(expElectoral!.fields[0]!.value).toBe('Registered');

    // Equifax: address + electoral
    const eqAddr = result.find(
      (r) => r.domain === 'addresses' && r.sourceSystem === 'Equifax',
    );
    expect(eqAddr).toBeDefined();
    expect(eqAddr!.fields.find((f) => f.name === 'address')!.value).toBe(addr2);

    const eqElectoral = result.find(
      (r) => r.domain === 'electoral_roll' && r.sourceSystem === 'Equifax',
    );
    expect(eqElectoral).toBeDefined();
    expect(eqElectoral!.fields[0]!.value).toBe('Not registered');

    // TransUnion: address only, no electoral
    const tuAddr = result.find(
      (r) => r.domain === 'addresses' && r.sourceSystem === 'TransUnion',
    );
    expect(tuAddr).toBeDefined();
    expect(tuAddr!.fields.find((f) => f.name === 'address')!.value).toBe(addr3);

    const tuElectoral = result.find(
      (r) => r.domain === 'electoral_roll' && r.sourceSystem === 'TransUnion',
    );
    expect(tuElectoral).toBeUndefined();
  });

  it('skips CRAs with sentinel text in address field', () => {
    const addr = randomAddress();
    const tableEl = buildAddressTable('Old Address', {
      Experian: { address: addr, name: randomName() },
      Equifax: { address: NO_DATA_SENTINEL },
      TransUnion: { address: NO_DATA_SENTINEL },
    });

    const section = createSection({
      heading: 'Addresses & Electoral Roll',
      content: tableEl.outerHTML,
    });
    document.body.appendChild(section);
    const classified: ClassifiedSection = { type: 'addresses', element: section, index: 0 };

    const result = extractAddresses([classified]);
    const addressSections = result.filter((r) => r.domain === 'addresses');
    expect(addressSections).toHaveLength(1);
    expect(addressSections[0]!.sourceSystem).toBe('Experian');
  });

  it('returns empty array for non-addresses sections', () => {
    const el = createSection({ heading: 'Payment History - Active Accounts' });
    document.body.appendChild(el);
    const sections: ClassifiedSection[] = [
      { type: 'active_accounts', element: el, index: 0 },
    ];
    expect(extractAddresses(sections)).toEqual([]);
  });

  it('returns empty array for empty sections list', () => {
    expect(extractAddresses([])).toEqual([]);
  });
});
