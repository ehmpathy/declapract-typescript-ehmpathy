import { given, then, when } from 'test-fns';

import { check, fix, getDobjNamesImported } from './*.ts.declapract';

const HANDLER = `import { z } from 'zod';

import { HomeService } from '@src/domain.objects/HomeService';
import { LeadCaptureForm as Form } from '../../domain.objects/LeadCaptureForm';
import type { Surfer } from '@src/domain.objects/Surfer';
import { WaveReport } from 'sdk-wave-reports';

const schemaOutput = z.object({
  service: HomeService.schema.nullable(),
  forms: z.array(Form.contract),
  ref: HomeService.contract.ref('primary'),
  report: WaveReport.schema,
});

export const isServiceShaped = (input: unknown) => HomeService.schema.safeParse(input).success;
export type ServiceShape = z.infer<typeof HomeService.schema>;
`;

describe('domain schema-over-contract (#565, #634)', () => {
  given('[case1] a handler whose published output refers to dobjs via .schema and a bare .contract', () => {
    then('the dobj names are read from domain.objects value imports only', () => {
      expect(getDobjNamesImported({ contents: HANDLER })).toEqual([
        'HomeService',
        'Form',
      ]);
    });

    then('the check flags it', () => {
      expect(() => check(HANDLER, {} as any)).not.toThrow();
    });

    when('[t0] the fix runs', () => {
      then('each published dobj reads X.contract(), with the paren', async () => {
        const { contents: after } = await fix(HANDLER, {} as any);
        expect(after).toContain('service: HomeService.contract().nullable(),');
        expect(after).toContain('forms: z.array(Form.contract()),');
        expect(after).toContain("ref: HomeService.contract().ref('primary'),");
        expect(after).toMatchSnapshot('handler — after');
      });

      then('a non-dobj schema, a .safeParse use, and a typeof query stay as they were', async () => {
        const { contents: after } = await fix(HANDLER, {} as any);
        expect(after).toContain('report: WaveReport.schema,');
        expect(after).toContain('HomeService.schema.safeParse(input)');
        expect(after).toContain('z.infer<typeof HomeService.schema>');
      });

      then('the check skips the fixed output, and a second pass is a no-op', async () => {
        const { contents: once } = await fix(HANDLER, {} as any);
        const { contents: twice } = await fix(once!, {} as any);
        expect(twice).toEqual(once);
        expect(() => check(once!, {} as any)).toThrow(
          'does not match bad practice',
        );
      });
    });
  });

  given('[case2] a contract that already reads X.contract()', () => {
    then('the check skips it', () => {
      const contents = `import { HomeService } from '@src/domain.objects/HomeService';
const schemaOutput = z.object({ service: HomeService.contract().nullable() });`;
      expect(() => check(contents, {} as any)).toThrow(
        'does not match bad practice',
      );
    });
  });
});
