/**
 * Detection and metadata extraction for Equifax PDF credit reports.
 *
 * The detect() function checks if extracted text looks like an Equifax report.
 * The getReportInfo() function extracts subject name, date, and reference.
 */

import type { PdfReportInfo } from '../types';

/**
 * Check if the given text sample (first ~2000 chars) looks like an Equifax credit report.
 *
 * @param textSample - The first portion of text extracted from the PDF
 * @returns true if the text appears to be an Equifax credit report
 */
export function detect(textSample: string): boolean {
  const sample = textSample.slice(0, 2000);
  return (
    sample.includes('Equifax Credit Report') &&
    sample.includes('Equifax Limited')
  );
}

/**
 * Extract report-level metadata from the full text of an Equifax PDF report.
 *
 * Parses:
 * - Subject name from the first line (e.g., "Mr.RobertKnight" -> "Mr. Robert Knight")
 * - Report date from "Created On: DD/MM/YYYY"
 * - Reference from "Reference: XXXXX"
 *
 * @param fullText - The complete text of the PDF report
 * @returns PdfReportInfo with extracted metadata
 */
export function getReportInfo(fullText: string): PdfReportInfo {
  const lines = fullText.split('\n');

  // Parse subject name from the first non-blank line
  let subjectName = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      subjectName = parseSubjectName(trimmed);
      break;
    }
  }

  // Parse created date
  let reportDate = '';
  const dateMatch = /Created On:\s*(\d{2}\/\d{2}\/\d{4})/.exec(fullText);
  if (dateMatch) {
    reportDate = dateMatch[1]!;
  }

  // Parse reference
  let reference: string | undefined;
  const refMatch = /Reference:\s*(\S+)/.exec(fullText);
  if (refMatch) {
    reference = refMatch[1]!;
  }

  // Page count comes from PdfExtractionInput, not from text.
  // But we can try to find it from "X of Y" patterns.
  let pageCount = 0;
  const pageCountMatch = /of\s+(\d+)/.exec(fullText.slice(0, 3000));
  if (pageCountMatch) {
    pageCount = parseInt(pageCountMatch[1]!, 10);
  }

  return {
    subjectName,
    reportDate,
    reference,
    pageCount,
  };
}

/**
 * Parse the subject name from the first line of the report.
 *
 * The first line typically appears as "Mr.RobertKnight" (no spaces between
 * title, first name, and surname). We insert spaces at camelCase boundaries
 * and after the title period.
 *
 * Examples:
 *   "Mr.RobertKnight" -> "Mr. Robert Knight"
 *   "Mrs.JaneDoe" -> "Mrs. Jane Doe"
 */
function parseSubjectName(raw: string): string {
  // Handle "Mr.FirstLast" format
  // Insert space after period following title
  let name = raw.replace(/^(Mr|Mrs|Ms|Miss|Dr|Prof)\./i, '$1. ');

  // Insert spaces before uppercase letters that follow lowercase letters
  // This splits "RobertKnight" into "Robert Knight"
  name = name.replace(/([a-z])([A-Z])/g, '$1 $2');

  return name.trim();
}
