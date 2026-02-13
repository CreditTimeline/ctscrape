import { SELECTORS } from '../../constants';

// --- Random data generators ---

const FIRST_NAMES = [
  'Alice',
  'Brian',
  'Carmen',
  'Derek',
  'Elena',
  'Frank',
  'Grace',
  'Hugo',
  'Isla',
  'James',
];
const LAST_NAMES = [
  'Anderson',
  'Brooks',
  'Carter',
  'Davies',
  'Edwards',
  'Foster',
  'Green',
  'Harris',
  'Irwin',
  'Jones',
];
const STREETS = [
  'Oak Lane',
  'Maple Drive',
  'Cedar Avenue',
  'Elm Road',
  'Pine Street',
  'Birch Close',
  'Ash Way',
  'Willow Crescent',
  'Beech Court',
  'Hazel Gardens',
];
const TOWNS = [
  'Millbrook',
  'Stonebridge',
  'Riverdale',
  'Lakewood',
  'Thornfield',
  'Clearwater',
  'Ashford',
  'Windemere',
  'Brookhaven',
  'Fairview',
];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const LENDERS = [
  'Northgate Bank',
  'Redwood Finance',
  'Sterling Credit',
  'Pinnacle Lending',
  'Oakmont Financial',
  'Summit Capital',
  'Crestline Bank',
  'Horizon Finance',
  'Beacon Credit',
  'Arcadia Lending',
];
const ACCOUNT_TYPES = [
  'Fixed Term Loan',
  'Credit Card',
  'Current Account',
  'Mortgage',
  'Hire Purchase',
  'Mail Order',
  'Overdraft',
  'Store Card',
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomName(): string {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

export function randomAddress(): string {
  return `${randInt(1, 200)} ${pick(STREETS)}, ${pick(TOWNS)}, AB${randInt(1, 99)} ${randInt(1, 9)}CD`;
}

/** Returns "DD Month YYYY" format */
export function randomDate(): string {
  const day = String(randInt(1, 28)).padStart(2, '0');
  return `${day} ${pick(MONTHS)} ${randInt(2015, 2025)}`;
}

/** Returns "DD/MM/YYYY" format */
export function randomSlashDate(): string {
  const day = String(randInt(1, 28)).padStart(2, '0');
  const month = String(randInt(1, 12)).padStart(2, '0');
  return `${day}/${month}/${randInt(2015, 2025)}`;
}

/** Returns "£N,NNN" format */
export function randomAmount(): string {
  const n = randInt(100, 99999);
  return `£${n.toLocaleString('en-GB')}`;
}

export function randomLender(): string {
  return pick(LENDERS);
}

export function randomAccountType(): string {
  return pick(ACCOUNT_TYPES);
}

export function randomLast4(): string {
  return String(randInt(1000, 9999));
}

// --- DOM builder helpers ---

/**
 * Create a section container element matching the page structure.
 */
export function createSection(options?: {
  heading?: string;
  introHeading?: string;
  content?: string;
  footerName?: string;
  footerDate?: string;
}): HTMLElement {
  const section = document.createElement('section');
  section.setAttribute('data-testid', SELECTORS.PAGE_CONTAINER);

  // Header
  const header = document.createElement('header');
  if (options?.heading) {
    const h1 = document.createElement('h1');
    h1.setAttribute('data-testid', SELECTORS.PAGE_HEADING);
    h1.textContent = options.heading;
    header.appendChild(h1);
  }
  if (options?.introHeading) {
    const h1 = document.createElement('h1');
    h1.setAttribute('data-testid', SELECTORS.INTRO_HEADING);
    h1.textContent = options.introHeading;
    header.appendChild(h1);
  }
  section.appendChild(header);

  // Empty inner section (matches real page structure)
  section.appendChild(document.createElement('section'));

  // Main content area
  const main = document.createElement('main');
  if (options?.content) {
    main.innerHTML = options.content;
  }
  section.appendChild(main);

  // Footer
  const footerName = options?.footerName ?? randomName();
  const footerDate = options?.footerDate ?? randomDate();
  section.appendChild(createFooter(footerName, footerDate));

  return section;
}

/**
 * Create a 4-column CRA table row: Label | Experian | Equifax | TransUnion
 * Each CRA cell gets data-testid="table-data-{CRA}-{fieldSlug}"
 */
export function createCraTableRow(
  fieldSlug: string,
  label: string,
  values: { Experian?: string; Equifax?: string; TransUnion?: string },
): HTMLTableRowElement {
  const tr = document.createElement('tr');

  // Label cell
  const labelTd = document.createElement('td');
  labelTd.textContent = label;
  tr.appendChild(labelTd);

  // CRA cells
  for (const cra of ['Experian', 'Equifax', 'TransUnion'] as const) {
    const td = document.createElement('td');
    const span = document.createElement('span');
    span.setAttribute('data-testid', `table-data-${cra}-${fieldSlug}`);
    span.textContent = values[cra] ?? '-';
    td.appendChild(span);
    tr.appendChild(td);
  }

  return tr;
}

/**
 * Create the CRA header row: empty | Experian | Equifax | TransUnion
 */
export function createCraHeaderRow(): HTMLTableRowElement {
  const tr = document.createElement('tr');

  const emptyTh = document.createElement('th');
  tr.appendChild(emptyTh);

  for (const cra of ['Experian', 'Equifax', 'TransUnion']) {
    const th = document.createElement('th');
    th.textContent = cra;
    tr.appendChild(th);
  }

  return tr;
}

/**
 * Create a full account table with heading and rows.
 */
export function createAccountTable(
  heading: string,
  rows: HTMLTableRowElement[],
  tableTestId?: string,
): HTMLElement {
  const wrapper = document.createElement('div');

  const h2 = document.createElement('h2');
  h2.setAttribute(
    'data-testid',
    SELECTORS.PAYMENT_HISTORY_TABLE_HEADING,
  );
  h2.textContent = heading;
  wrapper.appendChild(h2);

  const table = document.createElement('table');
  table.setAttribute(
    'data-testid',
    tableTestId ?? SELECTORS.PAYMENT_HISTORY_TABLE,
  );

  const thead = document.createElement('thead');
  thead.appendChild(createCraHeaderRow());
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const row of rows) {
    tbody.appendChild(row);
  }
  table.appendChild(tbody);

  wrapper.appendChild(table);
  return wrapper;
}

/**
 * Create a search card element.
 */
export function createSearchCard(options: {
  cra: string;
  date: string;
  company: string;
  name: string;
  address: string;
}): HTMLElement {
  const card = document.createElement('div');
  card.setAttribute('data-testid', SELECTORS.SEARCH_CARD);

  // Heading area with CRA name and date
  const heading = document.createElement('div');
  heading.setAttribute('data-testid', SELECTORS.SEARCH_HEADING);

  const agencyP = document.createElement('p');
  agencyP.setAttribute('data-testid', SELECTORS.SEARCH_AGENCY_NAME);
  agencyP.textContent = options.cra;
  heading.appendChild(agencyP);

  const dateP = document.createElement('p');
  dateP.textContent = options.date;
  heading.appendChild(dateP);

  card.appendChild(heading);

  // Company name
  const companySpan = document.createElement('span');
  companySpan.setAttribute(
    'data-testid',
    `table-data-${options.cra}-companyName`,
  );
  companySpan.textContent = options.company;
  card.appendChild(companySpan);

  // Name
  const nameP = document.createElement('p');
  nameP.setAttribute('data-testid', `table-data-${options.cra}-name`);
  nameP.textContent = options.name;
  card.appendChild(nameP);

  // Address
  const addressP = document.createElement('p');
  addressP.setAttribute(
    'data-testid',
    `table-data-${options.cra}-address`,
  );
  addressP.textContent = options.address;
  card.appendChild(addressP);

  return card;
}

/**
 * Create a payment history calendar grid for one CRA.
 */
export function createPaymentHistoryCalendar(
  cra: string,
  accountId: string,
  entries: Array<{
    month: number;
    year: number;
    status: string;
    text: string;
  }>,
): HTMLElement {
  const container = document.createElement('div');
  container.classList.add('calendar');

  // 13 month-label divs: empty + J,F,M,A,M,J,J,A,S,O,N,D
  const monthLetters = [
    '',
    'J',
    'F',
    'M',
    'A',
    'M',
    'J',
    'J',
    'A',
    'S',
    'O',
    'N',
    'D',
  ];
  for (const letter of monthLetters) {
    const monthDiv = document.createElement('div');
    monthDiv.classList.add('months');
    monthDiv.textContent = letter;
    container.appendChild(monthDiv);
  }

  // Group entries by year
  const byYear = new Map<number, typeof entries>();
  for (const entry of entries) {
    const yearEntries = byYear.get(entry.year) ?? [];
    yearEntries.push(entry);
    byYear.set(entry.year, yearEntries);
  }

  // Sort years ascending
  const sortedYears = [...byYear.keys()].sort((a, b) => a - b);

  for (const year of sortedYears) {
    // Year label
    const yearDiv = document.createElement('div');
    yearDiv.classList.add('years');
    yearDiv.textContent = String(year).slice(-2);
    container.appendChild(yearDiv);

    // 12 data divs for each month
    for (let month = 1; month <= 12; month++) {
      const rowDiv = document.createElement('div');
      rowDiv.classList.add('row');
      rowDiv.setAttribute(
        'data-key',
        `payment-history-calendar-${accountId}-${cra}-${month}-${year}`,
      );

      const entry = byYear.get(year)?.find((e) => e.month === month);
      const statusDiv = document.createElement('div');
      statusDiv.setAttribute('data-status', entry?.status ?? '-');
      statusDiv.textContent = entry?.text ?? '-';
      rowDiv.appendChild(statusDiv);

      container.appendChild(rowDiv);
    }
  }

  return container;
}

/**
 * Create a footer element matching the page footer structure.
 */
export function createFooter(name: string, date: string): HTMLElement {
  const footer = document.createElement('footer');
  footer.setAttribute('data-testid', SELECTORS.FOOTER);

  const small = document.createElement('small');
  small.setAttribute('data-testid', SELECTORS.FOOTER_REPORT_INFO);
  small.textContent = `Produced for ${name} on ${date}`;
  footer.appendChild(small);

  return footer;
}
