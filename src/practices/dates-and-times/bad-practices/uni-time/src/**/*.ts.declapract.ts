// eslint-disable-next-line import/no-extraneous-dependencies
import type { FileCheckFunction, FileFixFunction } from 'declapract';

export const check: FileCheckFunction = (contents) => {
  if (contents?.includes("from '@ehmpathy/uni-time'")) return; // matches if it includes this
  throw new Error('does not match bad practice'); // does not otherwise
};

/**
 * .what = each uni-time identifier and its iso-time twin, per iso-time's own migration table.
 * .why  = iso-time renamed every exported name (the `Iso{Unit}{Nature}` pattern), so a module swap
 *         alone leaves each imported name unresolved (#662).
 */
const UNI_TO_ISO_IDENTIFIERS: Record<string, string> = {
  UniDateTime: 'IsoTimeStamp',
  UniDate: 'IsoDateStamp',
  UniMonth: 'IsoMonthStamp',
  UniTime: 'IsoTimeFloat',
  UniDateRange: 'IsoDateStampRange',
  UniDateTimeRange: 'IsoTimeStampRange',
  UniDuration: 'IsoDuration',
  isUniDateTime: 'isIsoTimeStamp',
  isUniDate: 'isIsoDateStamp',
  isUniMonth: 'isIsoMonthStamp',
  asUniDateTime: 'asIsoTimeStamp',
  asUniDate: 'asIsoDateStamp',
};

/**
 * .what = rename each whole-word uni-time identifier to its iso-time twin.
 * .why  = a word boundary on both sides keeps an identifier that merely holds a uni-time name
 *         inside it (`CommunityUniDate`) untouched, and makes the map order-free.
 */
const withIsoIdentifiers = (input: { contents: string }): string =>
  input.contents.replace(
    new RegExp(`\\b(${Object.keys(UNI_TO_ISO_IDENTIFIERS).join('|')})\\b`, 'g'),
    (name) => UNI_TO_ISO_IDENTIFIERS[name] ?? name,
  );

export const fix: FileFixFunction = (contents) => {
  if (!contents) return {}; // pass through if contents absent

  // swap the module, then the names it exports
  const withIsoModule = contents.replace(
    /from '@ehmpathy\/uni-time'/g,
    "from 'iso-time'",
  );
  return { contents: withIsoIdentifiers({ contents: withIsoModule }) };
};
