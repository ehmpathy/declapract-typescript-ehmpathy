import { fix } from './package.json.declapract';
describe('format script package.json', () => {
  it('should replace "format" with "fix:format" in scripts', async () => {
    const exampleFoundContents = `
{
  "scripts": {
    "prior-key": "prior key value",
    "format": "some contents of format",
    "another-key": "another key value"
  },
  "name": "has a name"
}
    `;
    const fixedContents = await fix(exampleFoundContents, {} as any);
    expect(fixedContents.contents).not.toContain('"format"');
    expect(fixedContents.contents).toMatchSnapshot();
  });
});
