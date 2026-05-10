import type { FileCheckContext } from 'declapract';

import { fix } from './prep.json.declapract';

describe('old-parameterstorenamespace-key', () => {
  it('should remove parameterStoreNamespace from config', async () => {
    const contents = JSON.stringify(
      {
        organization: 'ahbode',
        project: 'svc-jobs',
        parameterStoreNamespace: 'ahbode.svc-jobs.prep',
        environment: { access: 'prep' },
      },
      null,
      2,
    );

    const result = await fix(contents, {} as FileCheckContext);
    const parsed = JSON.parse(result.contents!);

    expect(parsed.parameterStoreNamespace).toBeUndefined();
    expect(parsed.organization).toBe('ahbode');
    expect(parsed.project).toBe('svc-jobs');
    expect(parsed.environment.access).toBe('prep');
  });
});
