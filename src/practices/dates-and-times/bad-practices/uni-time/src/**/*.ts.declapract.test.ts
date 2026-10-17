import { check, fix } from './*.ts.declapract';

describe('uni-time bad practice source files', () => {
  it('should match files that import from @ehmpathy/uni-time', () => {
    const contents = `import { IsoDateTime } from '@ehmpathy/uni-time';`;
    expect(() => check(contents, {} as any)).not.toThrow();
  });

  it('should not match files without @ehmpathy/uni-time imports', () => {
    const contents = `import { IsoDateTime } from 'iso-time';`;
    expect(() => check(contents, {} as any)).toThrow('does not match bad practice');
  });

  it('should replace @ehmpathy/uni-time imports with iso-time', async () => {
    const contents = `import { IsoDateTime } from '@ehmpathy/uni-time';`;
    const { contents: fixed } = await fix(contents, {} as any);

    expect(fixed).toContain("from 'iso-time'");
    expect(fixed).not.toContain('@ehmpathy/uni-time');
  });

  it('should replace multiple @ehmpathy/uni-time imports', async () => {
    const contents = `
import { IsoDateTime } from '@ehmpathy/uni-time';
import { IsoDate } from '@ehmpathy/uni-time';
`;
    const { contents: fixed } = await fix(contents, {} as any);

    expect(fixed).not.toContain('@ehmpathy/uni-time');
    expect(fixed?.match(/from 'iso-time'/g)?.length).toBe(2);
  });

  // #662: iso-time names the uni-time identifiers differently, so the module swap alone leaves
  // every imported name unresolved. each Uni* identifier maps to its Iso* twin.
  it('should map each Uni* identifier onto its iso-time twin', async () => {
    const contents = `import {
  UniDateTime,
  UniDate,
  UniDateTimeRange,
  asUniDateTime,
  isUniDateTime,
  asUniDate,
  isUniDate,
} from '@ehmpathy/uni-time';
import type { UniDuration, UniMonth, UniDateRange, UniTime } from '@ehmpathy/uni-time';

export const at: UniDateTime = asUniDateTime(new Date());
export const on: UniDate = asUniDate(new Date());
export const ok = isUniDateTime(at) && isUniDate(on) && isUniMonth('2024-06');
export type Window = UniDateTimeRange | UniDateRange;
export type Gap = UniDuration;
export type Month = UniMonth;
export type Clock = UniTime;
`;
    const { contents: fixed } = await fix(contents, {} as any);
    expect(fixed).not.toMatch(/Uni[A-Z]/);
    expect(fixed).toContain('IsoTimeStamp,');
    expect(fixed).toContain('IsoDateStamp,');
    expect(fixed).toContain('IsoTimeStampRange,');
    expect(fixed).toContain('asIsoTimeStamp(new Date())');
    expect(fixed).toContain('isIsoTimeStamp(at) && isIsoDateStamp(on) && isIsoMonthStamp(');
    expect(fixed).toContain('asIsoDateStamp(new Date())');
    expect(fixed).toContain('IsoDuration');
    expect(fixed).toContain('IsoMonthStamp');
    expect(fixed).toContain('IsoDateStampRange');
    expect(fixed).toContain('IsoTimeFloat');
    expect(fixed).toMatchSnapshot('uni-time identifiers — after');
  });

  it('should leave an identifier that merely holds a Uni* name inside it', async () => {
    const contents = `import { UniDate } from '@ehmpathy/uni-time';
const CommunityUniDate = 1;
const myUniDateLabel = 'x';
`;
    const { contents: fixed } = await fix(contents, {} as any);
    expect(fixed).toContain('CommunityUniDate');
    expect(fixed).toContain('myUniDateLabel');
    expect(fixed).toContain('import { IsoDateStamp }');
  });

  it('should be idempotent and skip the fixed output', async () => {
    const contents = `import { UniDateTime } from '@ehmpathy/uni-time';
export const at: UniDateTime = '2024-06-15T00:00:00Z';`;
    const { contents: once } = await fix(contents, {} as any);
    const { contents: twice } = await fix(once!, {} as any);
    expect(twice).toEqual(once);
    expect(() => check(once!, {} as any)).toThrow('does not match bad practice');
  });
});
