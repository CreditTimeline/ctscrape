import { SELECTORS, SECTION_HEADINGS } from '../../constants';
import {
  createCraTableRow,
  createCraHeaderRow,
  createSearchCard,
  createPaymentHistoryCalendar,
  createFooter,
  randomName,
  randomAddress,
  randomDate,
  randomSlashDate,
  randomAmount,
  randomLender,
  randomAccountType,
  randomLast4,
} from './helpers';

/**
 * Build a complete CheckMyFile download page fixture with randomly generated data.
 * Returns the document and a summary of the generated data for assertions.
 */
export function buildFullReport(doc: Document): {
  subjectName: string;
  reportDate: string;
  activeAccountCount: number;
  closedAccountCount: number;
  addressCount: number;
  associationCount: number;
  aliasCount: number;
  hardSearchCount: number;
  softSearchCount: number;
} {
  doc.body.innerHTML = '';

  const subjectName = randomName();
  const reportDate = randomDate();

  // --- Intro section ---
  const introSection = doc.createElement('section');
  introSection.setAttribute('data-testid', SELECTORS.PAGE_CONTAINER);

  const introHeader = doc.createElement('header');
  const introH1 = doc.createElement('h1');
  introH1.setAttribute('data-testid', SELECTORS.INTRO_HEADING);
  introH1.textContent = `${subjectName}'s Credit File`;
  introHeader.appendChild(introH1);
  introSection.appendChild(introHeader);

  introSection.appendChild(doc.createElement('section'));

  const introMain = doc.createElement('main');
  const scoreEl = doc.createElement('span');
  scoreEl.setAttribute('data-testid', SELECTORS.SCORE);
  scoreEl.textContent = '742';
  introMain.appendChild(scoreEl);
  introSection.appendChild(introMain);

  introSection.appendChild(createFooter(subjectName, reportDate));
  doc.body.appendChild(introSection);

  // --- Active Accounts (2 accounts) ---
  const activeAccountCount = 2;
  for (let i = 0; i < activeAccountCount; i++) {
    const lender = randomLender();
    const acctType = randomAccountType();
    const last4 = randomLast4();
    const heading = `${lender} - ${acctType} - Ending ${last4}`;

    const section = doc.createElement('section');
    section.setAttribute('data-testid', SELECTORS.PAGE_CONTAINER);

    const header = doc.createElement('header');
    if (i === 0) {
      const h1 = doc.createElement('h1');
      h1.setAttribute('data-testid', SELECTORS.PAGE_HEADING);
      h1.textContent = SECTION_HEADINGS.ACTIVE_ACCOUNTS;
      header.appendChild(h1);
    }
    section.appendChild(header);
    section.appendChild(doc.createElement('section'));

    const main = doc.createElement('main');

    // Build table
    const tableWrapper = doc.createElement('div');
    const h2 = doc.createElement('h2');
    h2.setAttribute('data-testid', SELECTORS.PAYMENT_HISTORY_TABLE_HEADING);
    h2.textContent = heading;
    tableWrapper.appendChild(h2);

    const table = doc.createElement('table');
    table.setAttribute('data-testid', SELECTORS.PAYMENT_HISTORY_TABLE);
    const thead = doc.createElement('thead');
    thead.appendChild(createCraHeaderRow());
    table.appendChild(thead);

    const tbody = doc.createElement('tbody');
    const rows = [
      createCraTableRow('lender', 'Lender', {
        Experian: lender.toUpperCase(),
        Equifax: lender,
        TransUnion: lender.toUpperCase(),
      }),
      createCraTableRow('account-type', 'Account Type', {
        Experian: acctType,
        Equifax: acctType,
        TransUnion: acctType,
      }),
      createCraTableRow('opened', 'Opened', {
        Experian: randomDate(),
        Equifax: randomDate(),
        TransUnion: randomDate(),
      }),
      createCraTableRow('balance', 'Balance', {
        Experian: randomAmount(),
        Equifax: randomAmount(),
        TransUnion: randomAmount(),
      }),
      createCraTableRow('status', 'Status', {
        Experian: 'Active',
        Equifax: 'Active',
        TransUnion: 'Active',
      }),
    ];

    // Payment history row with calendar
    const phRow = doc.createElement('tr');
    const phLabel = doc.createElement('td');
    phLabel.textContent = 'Payment History';
    phRow.appendChild(phLabel);

    const accountId = `acct-${i}-${Math.random().toString(36).slice(2, 8)}`;
    for (const cra of ['Experian', 'Equifax', 'TransUnion']) {
      const td = doc.createElement('td');
      const span = doc.createElement('span');
      span.setAttribute('data-testid', `table-data-${cra}-payment-history`);
      span.appendChild(
        createPaymentHistoryCalendar(cra, accountId, [
          { month: 1, year: 2025, status: 'Clean Payment', text: 'OK' },
          { month: 2, year: 2025, status: 'Clean Payment', text: 'OK' },
        ]),
      );
      td.appendChild(span);
      phRow.appendChild(td);
    }
    rows.push(phRow);

    for (const row of rows) {
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    main.appendChild(tableWrapper);

    section.appendChild(main);
    section.appendChild(createFooter(subjectName, reportDate));
    doc.body.appendChild(section);
  }

  // --- Closed Accounts (1 account) ---
  const closedAccountCount = 1;
  for (let i = 0; i < closedAccountCount; i++) {
    const lender = randomLender();
    const acctType = randomAccountType();
    const last4 = randomLast4();
    const heading = `${lender} - ${acctType} - Ending ${last4}`;

    const section = doc.createElement('section');
    section.setAttribute('data-testid', SELECTORS.PAGE_CONTAINER);

    const header = doc.createElement('header');
    if (i === 0) {
      const h1 = doc.createElement('h1');
      h1.setAttribute('data-testid', SELECTORS.PAGE_HEADING);
      h1.textContent = SECTION_HEADINGS.CLOSED_ACCOUNTS;
      header.appendChild(h1);
    }
    section.appendChild(header);
    section.appendChild(doc.createElement('section'));

    const main = doc.createElement('main');
    const tableWrapper = doc.createElement('div');
    const h2 = doc.createElement('h2');
    h2.setAttribute('data-testid', SELECTORS.PAYMENT_HISTORY_TABLE_HEADING);
    h2.textContent = heading;
    tableWrapper.appendChild(h2);

    const table = doc.createElement('table');
    table.setAttribute('data-testid', SELECTORS.PAYMENT_HISTORY_TABLE);
    const thead = doc.createElement('thead');
    thead.appendChild(createCraHeaderRow());
    table.appendChild(thead);

    const tbody = doc.createElement('tbody');
    const rows = [
      createCraTableRow('lender', 'Lender', {
        Experian: lender,
        Equifax: lender,
      }),
      createCraTableRow('account-type', 'Account Type', {
        Experian: acctType,
        Equifax: acctType,
      }),
      createCraTableRow('opened', 'Opened', {
        Experian: randomDate(),
        Equifax: randomDate(),
      }),
      createCraTableRow('closed', 'Closed', {
        Experian: randomDate(),
        Equifax: randomDate(),
      }),
      createCraTableRow('balance', 'Balance', {
        Experian: '£0',
        Equifax: '£0',
      }),
      createCraTableRow('status', 'Status', {
        Experian: 'Settled',
        Equifax: 'Settled',
      }),
    ];
    for (const row of rows) {
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    main.appendChild(tableWrapper);

    section.appendChild(main);
    section.appendChild(createFooter(subjectName, reportDate));
    doc.body.appendChild(section);
  }

  // --- Addresses (2 addresses) ---
  const addressCount = 2;
  for (let i = 0; i < addressCount; i++) {
    const addr = randomAddress();
    const section = doc.createElement('section');
    section.setAttribute('data-testid', SELECTORS.PAGE_CONTAINER);

    const header = doc.createElement('header');
    if (i === 0) {
      const h1 = doc.createElement('h1');
      h1.setAttribute('data-testid', SELECTORS.PAGE_HEADING);
      h1.textContent = SECTION_HEADINGS.ADDRESSES;
      header.appendChild(h1);
    }
    section.appendChild(header);
    section.appendChild(doc.createElement('section'));

    const main = doc.createElement('main');
    const tableWrapper = doc.createElement('div');
    const h2 = doc.createElement('h2');
    h2.setAttribute('data-testid', SELECTORS.ADDRESSES_TABLE_HEADING);
    h2.textContent = addr;
    tableWrapper.appendChild(h2);

    const table = doc.createElement('table');
    table.setAttribute('data-testid', SELECTORS.ADDRESSES_TABLE);
    const thead = doc.createElement('thead');
    thead.appendChild(createCraHeaderRow());
    table.appendChild(thead);

    const tbody = doc.createElement('tbody');
    tbody.appendChild(
      createCraTableRow('address', 'Address', {
        Experian: addr,
        Equifax: addr,
        TransUnion: addr,
      }),
    );
    tbody.appendChild(
      createCraTableRow('name', 'Name', {
        Experian: randomName(),
        Equifax: randomName(),
        TransUnion: randomName(),
      }),
    );
    tbody.appendChild(
      createCraTableRow('electoral-roll', 'Electoral Roll', {
        Experian: 'Registered',
        Equifax: 'Registered',
      }),
    );
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    main.appendChild(tableWrapper);

    section.appendChild(main);
    section.appendChild(createFooter(subjectName, reportDate));
    doc.body.appendChild(section);
  }

  // --- Associations (1) ---
  const associationCount = 1;
  {
    const section = doc.createElement('section');
    section.setAttribute('data-testid', SELECTORS.PAGE_CONTAINER);

    const header = doc.createElement('header');
    const h1 = doc.createElement('h1');
    h1.setAttribute('data-testid', SELECTORS.PAGE_HEADING);
    h1.textContent = SECTION_HEADINGS.ASSOCIATIONS;
    header.appendChild(h1);
    section.appendChild(header);
    section.appendChild(doc.createElement('section'));

    const main = doc.createElement('main');
    const tableWrapper = doc.createElement('div');
    const assocName = randomName();
    const h2 = doc.createElement('h2');
    h2.setAttribute('data-testid', SELECTORS.ASSOCIATIONS_TABLE_HEADING);
    h2.textContent = `Association to ${assocName}`;
    tableWrapper.appendChild(h2);

    const table = doc.createElement('table');
    table.setAttribute('data-testid', SELECTORS.ASSOCIATIONS_TABLE);
    const thead = doc.createElement('thead');
    thead.appendChild(createCraHeaderRow());
    table.appendChild(thead);

    const tbody = doc.createElement('tbody');
    tbody.appendChild(
      createCraTableRow('associated-to', 'Associated To', {
        Experian: assocName,
        Equifax: assocName,
      }),
    );
    tbody.appendChild(
      createCraTableRow('created-by', 'Created By', {
        Experian: randomLender(),
        Equifax: randomLender(),
      }),
    );
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    main.appendChild(tableWrapper);

    section.appendChild(main);
    section.appendChild(createFooter(subjectName, reportDate));
    doc.body.appendChild(section);
  }

  // --- Aliases (1) ---
  const aliasCount = 1;
  {
    const section = doc.createElement('section');
    section.setAttribute('data-testid', SELECTORS.PAGE_CONTAINER);

    const header = doc.createElement('header');
    const h1 = doc.createElement('h1');
    h1.setAttribute('data-testid', SELECTORS.PAGE_HEADING);
    h1.textContent = SECTION_HEADINGS.ALIASES;
    header.appendChild(h1);
    section.appendChild(header);
    section.appendChild(doc.createElement('section'));

    const main = doc.createElement('main');
    const tableWrapper = doc.createElement('div');
    const aliasNameVal = randomName();
    const h2 = doc.createElement('h2');
    h2.setAttribute('data-testid', SELECTORS.ALIASES_TABLE_HEADING);
    h2.textContent = `Alias of ${aliasNameVal}`;
    tableWrapper.appendChild(h2);

    const table = doc.createElement('table');
    table.setAttribute('data-testid', SELECTORS.ALIASES_TABLE);
    const thead = doc.createElement('thead');
    thead.appendChild(createCraHeaderRow());
    table.appendChild(thead);

    const tbody = doc.createElement('tbody');
    tbody.appendChild(
      createCraTableRow('alias-name', 'Alias Name', {
        Experian: aliasNameVal,
      }),
    );
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    main.appendChild(tableWrapper);

    section.appendChild(main);
    section.appendChild(createFooter(subjectName, reportDate));
    doc.body.appendChild(section);
  }

  // --- Hard Searches (2 cards) ---
  const hardSearchCount = 2;
  {
    const section = doc.createElement('section');
    section.setAttribute('data-testid', SELECTORS.PAGE_CONTAINER);

    const header = doc.createElement('header');
    const h1 = doc.createElement('h1');
    h1.setAttribute('data-testid', SELECTORS.PAGE_HEADING);
    h1.textContent = SECTION_HEADINGS.HARD_SEARCHES;
    header.appendChild(h1);
    section.appendChild(header);
    section.appendChild(doc.createElement('section'));

    const main = doc.createElement('main');
    for (let i = 0; i < hardSearchCount; i++) {
      main.appendChild(
        createSearchCard({
          cra: i === 0 ? 'Experian' : 'Equifax',
          date: randomSlashDate(),
          company: randomLender(),
          name: randomName(),
          address: randomAddress(),
        }),
      );
    }

    section.appendChild(main);
    section.appendChild(createFooter(subjectName, reportDate));
    doc.body.appendChild(section);
  }

  // --- Soft Searches (1 card) ---
  const softSearchCount = 1;
  {
    const section = doc.createElement('section');
    section.setAttribute('data-testid', SELECTORS.PAGE_CONTAINER);

    const header = doc.createElement('header');
    const h1 = doc.createElement('h1');
    h1.setAttribute('data-testid', SELECTORS.PAGE_HEADING);
    h1.textContent = SECTION_HEADINGS.SOFT_SEARCHES;
    header.appendChild(h1);
    section.appendChild(header);
    section.appendChild(doc.createElement('section'));

    const main = doc.createElement('main');
    main.appendChild(
      createSearchCard({
        cra: 'TransUnion',
        date: randomSlashDate(),
        company: randomLender(),
        name: randomName(),
        address: randomAddress(),
      }),
    );

    section.appendChild(main);
    section.appendChild(createFooter(subjectName, reportDate));
    doc.body.appendChild(section);
  }

  return {
    subjectName,
    reportDate,
    activeAccountCount,
    closedAccountCount,
    addressCount,
    associationCount,
    aliasCount,
    hardSearchCount,
    softSearchCount,
  };
}
