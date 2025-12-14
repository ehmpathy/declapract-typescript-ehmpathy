import { fix } from './*.ts.declapract';

describe('src/**/*.ts', () => {
  it('should replace imports to .../model w/ .../domain.objects', async () => {
    const { contents: fixedContents } = await fix(
      `
import { SomethingCool } from '../../../model';
    `.trim(),
      { relativeFilePath: 'src/logic/some/cool/thing.ts' } as any,
    );
    expect(fixedContents).not.toContain('../../../model');
    expect(fixedContents).toContain('../../../domain.objects');
  });
  it('should replace imports to .../model/something-else w/ .../domain.objects/something-else', async () => {
    const { contents: fixedContents } = await fix(
      `
import { SomethingCool } from '../../../model/some/sub/thing';
    `.trim(),
      { relativeFilePath: 'src/logic/some/cool/thing.ts' } as any,
    );
    expect(fixedContents).not.toContain('../../../model/some/sub/thing');
    expect(fixedContents).toContain('../../../domain.objects/some/sub/thing');
  });
  it('should replace imports to .../model/domainObjects w/ .../domain.objects', async () => {
    const { contents: fixedContents } = await fix(
      `
import { SomethingCool } from '../../../model/domainObjects/sub/thing';
    `.trim(),
      { relativeFilePath: 'src/logic/some/cool/thing.ts' } as any,
    );
    expect(fixedContents).not.toContain(
      '../../../model/domainObjects/sub/thing',
    );
    expect(fixedContents).toContain('../../../domain.objects/sub/thing');
  });
  it('should replace @src/model imports w/ @src/domain.objects', async () => {
    const { contents: fixedContents } = await fix(
      `
import { SomethingCool } from '@src/model';
    `.trim(),
      { relativeFilePath: 'src/logic/some/cool/thing.ts' } as any,
    );
    expect(fixedContents).not.toContain('@src/model');
    expect(fixedContents).toContain('@src/domain.objects');
  });
  it('should replace @src/model/something imports w/ @src/domain.objects/something', async () => {
    const { contents: fixedContents } = await fix(
      `
import { SomethingCool } from '@src/model/objects/User';
    `.trim(),
      { relativeFilePath: 'src/logic/some/cool/thing.ts' } as any,
    );
    expect(fixedContents).not.toContain('@src/model/objects/User');
    expect(fixedContents).toContain('@src/domain.objects/objects/User');
  });
  it('should replace @src/model/domainObjects imports w/ @src/domain.objects', async () => {
    const { contents: fixedContents } = await fix(
      `
import { SomethingCool } from '@src/model/domainObjects/User';
    `.trim(),
      { relativeFilePath: 'src/logic/some/cool/thing.ts' } as any,
    );
    expect(fixedContents).not.toContain('@src/model/domainObjects/User');
    expect(fixedContents).toContain('@src/domain.objects/User');
  });
});
