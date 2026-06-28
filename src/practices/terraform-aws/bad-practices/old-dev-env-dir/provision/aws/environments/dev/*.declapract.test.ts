import { check, fix } from './*.declapract';
import { FileCheckType } from 'declapract';

describe('old-dev-env-dir', () => {
  it('should use EXISTS check type', () => {
    expect(check).toBe(FileCheckType.EXISTS);
  });

  it('should move files from dev/ to prep/', async () => {
    const context = {
      relativeFilePath: 'provision/aws/environments/dev/main.tf',
    } as any;

    const result = await fix('# terraform content', context);

    expect(result.relativeFilePath).toBe(
      'provision/aws/environments/prep/main.tf',
    );
    expect(result.contents).toBe('# terraform content');
  });

  it('should handle nested files in dev/', async () => {
    const context = {
      relativeFilePath: 'provision/aws/environments/dev/modules/vpc.tf',
    } as any;

    const result = await fix('# vpc config', context);

    expect(result.relativeFilePath).toBe(
      'provision/aws/environments/prep/modules/vpc.tf',
    );
  });
});
