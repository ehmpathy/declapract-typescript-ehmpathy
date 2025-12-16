import { fix } from './declastruct.resources.ts.declapract';

describe('old-declastruct-resources-path declastruct.resources.ts', () => {
  it('should delete the file by returning null contents', async () => {
    const contents = 'export const getResources = () => [];';

    const result = await fix(contents, {} as any);

    expect(result.contents).toBeNull();
  });
});
