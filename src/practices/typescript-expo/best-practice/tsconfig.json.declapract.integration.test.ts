import { FileCheckType } from 'declapract';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { check } from './tsconfig.json.declapract';

/**
 * .why integration = the template-content assertions read the shipped `tsconfig.json`
 *   template from disk via readFileSync — a filesystem boundary. per
 *   rule.forbid.unit.remote-boundaries a `.test.ts` (unit) may not cross an fs boundary,
 *   so this guard (which exists to catch DRIFT in the real template) lives at the
 *   integration grain, where a real file read is permitted. an inline copy would test a
 *   hardcoded string, not the template, so it could not catch the drift this guards.
 */
describe('typescript-expo tsconfig.json', () => {
  it('declares a CONTAINS check (a consumer may customize around the expo base)', () => {
    expect(check).toEqual(FileCheckType.CONTAINS);
  });

  it('the emitted template is expo-shaped, not node', () => {
    const template = JSON.parse(
      readFileSync(path.join(__dirname, 'tsconfig.json'), 'utf-8'),
    );
    // extends the expo base (jsx + react-native resolution), NOT @tsconfig/node20
    expect(template.extends).toEqual('expo/tsconfig.base');
    // the core path aliases a consumer relies on
    expect(template.compilerOptions.paths['@src/*']).toEqual(['src/*']);
    expect(template.compilerOptions.paths['@assets/*']).toEqual(['assets/*']);
    // tsx is included (a react-native app has jsx), unlike the node tsconfig
    expect(template.include).toContain('**/*.tsx');
  });
});
