import { fix } from './*.ts.declapract';

describe('src/**/*.ts', () => {
  it('should replace imports to .../model w/ .../domain', async () => {
    const { contents: fixedContents } = await fix(
      `
import { SomethingCool } from '../../../model';
    `.trim(),
      { relativeFilePath: 'src/logic/some/cool/thing.ts' } as any,
    );
    expect(fixedContents).not.toContain('../../../model');
    expect(fixedContents).toContain('../../../domain');
  });
  it('should replace imports to .../model/something-else w/ .../domain/something-else', async () => {
    const { contents: fixedContents } = await fix(
      `
import { SomethingCool } from '../../../model/some/sub/thing';
    `.trim(),
      { relativeFilePath: 'src/logic/some/cool/thing.ts' } as any,
    );
    expect(fixedContents).not.toContain('../../../model/some/sub/thing');
    expect(fixedContents).toContain('../../../domain/some/sub/thing');
  });
  it('should replace imports to .../model/domainObjects w/ .../domain/objects', async () => {
    const { contents: fixedContents } = await fix(
      `
import { SomethingCool } from '../../../model/domainObjects/sub/thing';
    `.trim(),
      { relativeFilePath: 'src/logic/some/cool/thing.ts' } as any,
    );
    expect(fixedContents).not.toContain(
      '../../../model/domainObjects/sub/thing',
    );
    expect(fixedContents).toContain('../../../domain/objects/sub/thing');
  });
});
