import type { RawSection } from '@/adapters/types';
import type {
  Tradeline,
  TradelineIdentifier,
  TradelineTerms,
  TradelineSnapshot,
  TradelineMonthlyMetric,
  TradelineEvent,
  TradelineAccountType,
  TradelineTermType,
  TradelineEventType,
} from '../credit-file.types';
import type { NormalisationContext } from '../context';
import {
  nextCounter,
  getImportId,
  registerOrganisation,
  normalizeOrgName,
} from '../context';
import { generateId, generateSequentialId } from '../id-generator';
import { groupFieldsByGroupKey } from '../field-grouper';
import { mapAccountType } from '../mappers/account-type';
import { mapAccountStatus } from '../mappers/account-status';
import { mapCheckMyFilePaymentStatus, mapCraPaymentCode } from '../mappers/payment-status';
import { parseLongDate, parseSlashDate, parseAmount } from '@/utils/parsers';

// ---------------------------------------------------------------------------
// Flexible date parser — tries long-form first, then slash format
// ---------------------------------------------------------------------------

function parseDate(text: string): string | null {
  return parseLongDate(text) ?? parseSlashDate(text);
}

// ---------------------------------------------------------------------------
// Heading parser
// ---------------------------------------------------------------------------

interface ParsedHeading {
  lender?: string;
  accountType?: string;
  last4?: string;
  sectionPrefix?: string;
}

function parseHeading(groupKey: string): ParsedHeading {
  const colonIdx = groupKey.indexOf(':');
  const sectionPrefix = colonIdx >= 0 ? groupKey.substring(0, colonIdx) : undefined;
  const heading = colonIdx >= 0 ? groupKey.substring(colonIdx + 1) : groupKey;

  const parts = heading.split(' - ').map(p => p.trim());
  const result: ParsedHeading = { sectionPrefix };

  if (parts.length >= 1) result.lender = parts[0];
  if (parts.length >= 2) result.accountType = parts[1];
  if (parts.length >= 3) {
    const ending = parts[2]!;
    const match = ending.match(/Ending\s+(\S+)/i);
    if (match) result.last4 = match[1];
  }

  return result;
}

// ---------------------------------------------------------------------------
// Term type inference
// ---------------------------------------------------------------------------

function inferTermType(accountType: TradelineAccountType): TradelineTermType {
  switch (accountType) {
    case 'credit_card':
    case 'budget_account':
      return 'revolving';
    case 'mortgage':
      return 'mortgage';
    case 'rental':
      return 'rental';
    case 'unsecured_loan':
    case 'secured_loan':
      return 'installment';
    default:
      return 'other';
  }
}

// ---------------------------------------------------------------------------
// Event detection
// ---------------------------------------------------------------------------

const paymentHistoryRe = /^payment_history_(\d{4})_(\d{2})$/;

function detectEvents(
  statusCurrent: string | undefined,
  closedAt: string | undefined,
  openedAt: string | undefined,
  importId: string,
  ctx: NormalisationContext,
  defaultDate?: string,
): TradelineEvent[] {
  const events: TradelineEvent[] = [];
  if (!statusCurrent) return events;

  const lower = statusCurrent.toLowerCase();

  if (lower.includes('default')) {
    events.push({
      event_id: generateSequentialId('evt', nextCounter(ctx, 'evt')),
      event_type: 'default' as TradelineEventType,
      event_date: defaultDate ?? closedAt ?? openedAt ?? new Date().toISOString().split('T')[0]!,
      source_import_id: importId,
    });
  }

  if ((lower.includes('settled') || lower.includes('satisfied')) && closedAt) {
    events.push({
      event_id: generateSequentialId('evt', nextCounter(ctx, 'evt')),
      event_type: 'settled' as TradelineEventType,
      event_date: closedAt,
      source_import_id: importId,
    });
  }

  if (lower.includes('arrangement')) {
    events.push({
      event_id: generateSequentialId('evt', nextCounter(ctx, 'evt')),
      event_type: 'arrangement_to_pay' as TradelineEventType,
      event_date: openedAt ?? new Date().toISOString().split('T')[0]!,
      source_import_id: importId,
    });
  }

  return events;
}

// ---------------------------------------------------------------------------
// Main stage
// ---------------------------------------------------------------------------

export function buildTradelines(
  sections: RawSection[],
  ctx: NormalisationContext,
): void {
  const groups = groupFieldsByGroupKey(sections, 'tradelines');

  for (const [groupKey, group] of groups) {
    const heading = parseHeading(groupKey);
    const sourceSystem = group.sourceSystem ?? 'equifax';
    const importId = getImportId(ctx, group.sourceSystem);

    // --- Furnisher / lender ---
    const lenderField = group.fields.get('heading_lender') ?? group.fields.get('lender');
    const furnisherName = lenderField?.value ?? heading.lender;
    let furnisherOrgId: string | undefined;
    if (furnisherName) {
      furnisherOrgId = registerOrganisation(ctx, furnisherName, 'furnisher', importId);
    }

    // --- Account type ---
    const accountTypeField = group.fields.get('heading_account_type') ?? group.fields.get('account-type');
    const rawAccountType = accountTypeField?.value ?? heading.accountType ?? '';
    const { accountType, warning: atWarning } = mapAccountType(rawAccountType, sourceSystem);
    if (atWarning) ctx.warnings.push(atWarning);

    // --- Dates ---
    const openedField = group.fields.get('opened');
    const openedAt = openedField ? parseDate(openedField.value) : undefined;

    const closedField = group.fields.get('closed');
    let closedAt = closedField ? parseDate(closedField.value) : undefined;

    // Fallback: use date_satisfied as closedAt
    if (!closedAt) {
      const dateSatisfiedField = group.fields.get('date_satisfied');
      if (dateSatisfiedField) {
        closedAt = parseDate(dateSatisfiedField.value) ?? undefined;
      }
    }

    // is_closed hint
    const isClosedField = group.fields.get('is_closed');

    // --- Status ---
    const statusField = group.fields.get('status');
    let statusCurrent: string | undefined;
    if (statusField) {
      const { canonicalStatus, warning: statusWarning } = mapAccountStatus(statusField.value, sourceSystem);
      statusCurrent = canonicalStatus;
      if (statusWarning) ctx.warnings.push(statusWarning);
    }

    // Use is_closed hint to infer settled status when no explicit status
    if (!statusCurrent && isClosedField?.value === 'true') {
      statusCurrent = 'settled';
    }

    // --- Last 4 (identifier) ---
    const last4Field = group.fields.get('heading_last4');
    const last4 = last4Field?.value ?? heading.last4;

    const identifiers: TradelineIdentifier[] = [];
    if (last4) {
      identifiers.push({
        identifier_id: generateSequentialId('tid', nextCounter(ctx, 'tid')),
        identifier_type: 'masked_account_number',
        value: last4,
        source_import_id: importId,
      });
    }

    // --- Terms ---
    const repaymentPeriodField = group.fields.get('repayment-period');
    const regularPaymentField = group.fields.get('regular-payment');

    let terms: TradelineTerms | undefined;
    let regularPaymentAmount: number | undefined;

    if (repaymentPeriodField || regularPaymentField) {
      const termCount = repaymentPeriodField ? parseInt(repaymentPeriodField.value, 10) : undefined;
      const paymentAmount = regularPaymentField ? parseAmount(regularPaymentField.value) : undefined;
      if (paymentAmount != null) regularPaymentAmount = paymentAmount;

      terms = {
        terms_id: generateSequentialId('trm', nextCounter(ctx, 'trm')),
        term_type: inferTermType(accountType),
        term_count: termCount && !isNaN(termCount) ? termCount : undefined,
        term_payment_amount: paymentAmount ?? undefined,
        source_import_id: importId,
      };
    }

    // --- Snapshot ---
    const openingBalanceField = group.fields.get('opening-balance');
    const balanceField = group.fields.get('balance');
    const limitField = group.fields.get('limit');
    const reportedUntilField = group.fields.get('reported-until');

    const openingBalance = openingBalanceField ? parseAmount(openingBalanceField.value) : undefined;
    const currentBalance = balanceField ? parseAmount(balanceField.value) : undefined;
    const creditLimit = limitField ? parseAmount(limitField.value) : undefined;

    let asOfDate = reportedUntilField ? parseDate(reportedUntilField.value) : undefined;
    if (!asOfDate) {
      const dateUpdatedField = group.fields.get('date_updated');
      if (dateUpdatedField) {
        asOfDate = parseDate(dateUpdatedField.value) ?? undefined;
      }
    }

    const snapshots: TradelineSnapshot[] = [];
    if (openingBalance != null || currentBalance != null || creditLimit != null || asOfDate) {
      snapshots.push({
        snapshot_id: generateSequentialId('snap', nextCounter(ctx, 'snap')),
        as_of_date: asOfDate ?? undefined,
        status_current: statusCurrent,
        current_balance: currentBalance ?? undefined,
        opening_balance: openingBalance ?? undefined,
        credit_limit: creditLimit ?? undefined,
        source_import_id: importId,
      });
    }

    // --- Monthly metrics (payment history) ---
    // Use CRA payment codes only for direct Equifax PDF adapter; CheckMyFile uses descriptive text
    const usesCraPaymentCodes = ctx.metadata.adapterId === 'equifax-pdf';
    const metrics: TradelineMonthlyMetric[] = [];
    for (const [fieldName, field] of group.fields) {
      const match = fieldName.match(paymentHistoryRe);
      if (!match) continue;

      const period = `${match[1]}-${match[2]}`;
      const { canonicalStatus, warning: phWarning } = usesCraPaymentCodes
        ? mapCraPaymentCode(field.value, 'equifax')
        : mapCheckMyFilePaymentStatus(field.value);
      if (phWarning) ctx.warnings.push(phWarning);

      metrics.push({
        monthly_metric_id: generateSequentialId('mm', nextCounter(ctx, 'mm')),
        period,
        metric_type: 'payment_status',
        value_text: field.value,
        canonical_status: canonicalStatus,
        source_import_id: importId,
      });
    }

    // --- Account number identifier ---
    const accountNumberField = group.fields.get('account_number');
    if (accountNumberField) {
      identifiers.push({
        identifier_id: generateSequentialId('tid', nextCounter(ctx, 'tid')),
        identifier_type: 'masked_account_number',
        value: accountNumberField.value,
        source_import_id: importId,
      });
    }

    // --- Events ---
    const defaultDateField = group.fields.get('default_date');
    const defaultDate = defaultDateField ? parseDate(defaultDateField.value) ?? undefined : undefined;
    const events = detectEvents(statusCurrent, closedAt ?? undefined, openedAt ?? undefined, importId, ctx, defaultDate);

    // --- Canonical ID ---
    const canonicalId = generateId(
      'canon',
      normalizeOrgName(furnisherName ?? ''),
      accountType,
      last4 ?? '',
      openedAt ?? '',
    );

    // --- Tradeline ID ---
    const tradelineId = generateSequentialId('tl', nextCounter(ctx, 'tl'));

    // --- Build tradeline ---
    const tradeline: Tradeline = {
      tradeline_id: tradelineId,
      canonical_id: canonicalId,
      furnisher_organisation_id: furnisherOrgId,
      furnisher_name_raw: furnisherName,
      account_type: accountType,
      opened_at: openedAt ?? undefined,
      closed_at: closedAt ?? undefined,
      status_current: statusCurrent,
      regular_payment_amount: regularPaymentAmount,
      identifiers: identifiers.length > 0 ? identifiers : undefined,
      terms,
      snapshots: snapshots.length > 0 ? snapshots : undefined,
      monthly_metrics: metrics.length > 0 ? metrics : undefined,
      events: events.length > 0 ? events : undefined,
      source_import_id: importId,
    };

    ctx.tradelines.push(tradeline);
  }
}

export { parseHeading, inferTermType, detectEvents };
