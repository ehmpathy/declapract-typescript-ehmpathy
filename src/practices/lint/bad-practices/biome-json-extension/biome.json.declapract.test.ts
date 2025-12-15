import { fix } from './biome.json.declapract';

describe('biome-json-extension biome.json', () => {
  it('should delete biome.json by returning null contents', async () => {
    const contents = JSON.stringify({ linter: { enabled: true } }, null, 2);

    const result = await fix(contents, {} as any);

    expect(result.contents).toBeNull();
  });
});
