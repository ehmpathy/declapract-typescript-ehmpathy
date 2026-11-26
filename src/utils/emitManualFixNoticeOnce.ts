/**
 * .what = the notices already printed, keyed by project root and practice
 */
const noticesPrinted = new Set<string>();

/**
 * .what = writes a manual-fix notice to stderr, once per project root and practice per process
 * .why  = declapract's plan prints only `[FIX_MANUAL] <file>` and the practice name for a check with no
 *         fix; it reads a practice readme but never shows it. a check that flags a manual move names
 *         the move here, at the moment the adopter reads the plan, the way the `.npmrc` fix names its
 *         remedy (`node/best-practice/.npmrc.declapract.ts`)
 * .note = stderr only, so the check's verdict stays its return or throw. a practice that flags many
 *         files of one root prints its notice once
 */
export const emitManualFixNoticeOnce = (input: {
  root: string;
  practice: string;
  notice: string;
}): void => {
  // print once per root and practice
  const key = `${input.root}\u0000${input.practice}`;
  if (noticesPrinted.has(key)) return;
  noticesPrinted.add(key); // .note = deliberate mutation: the print-once guard records this key

  process.stderr.write(input.notice);
};
