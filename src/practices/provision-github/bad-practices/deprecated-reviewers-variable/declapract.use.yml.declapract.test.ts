import { given, then, when } from 'test-fns';

import { check, fix } from './declapract.use.yml.declapract';

describe('deprecated-reviewers-variable declapract.use.yml', () => {
  given('[case1] declapract.use.yml with reviewers variable', () => {
    const contents = `# declapract.use.yml
declarations: ./
useCase: npm-package
variables:
  organizationName: 'ehmpathy'
  projectName: 'some-project'
  reviewers:
    users:
      - uladkasach
`;

    when('[t0] check is called', () => {
      then('it should detect the bad practice', () => {
        expect(() => check(contents, {} as any)).not.toThrow();
      });
    });

    when('[t1] fix is called', () => {
      then('it should remove the reviewers variable', async () => {
        const result = await fix(contents, {} as any);
        expect(result.contents).not.toContain('reviewers');
        expect(result.contents).toContain('organizationName');
        expect(result.contents).toContain('projectName');
        expect(result.contents).toMatchSnapshot();
      });
    });
  });

  given('[case2] declapract.use.yml without reviewers variable', () => {
    const contents = `# declapract.use.yml
declarations: ./
useCase: npm-package
variables:
  organizationName: 'ehmpathy'
  projectName: 'some-project'
`;

    when('[t0] check is called', () => {
      then('it should not detect the bad practice', () => {
        expect(() => check(contents, {} as any)).toThrow(
          'no deprecated reviewers variable found',
        );
      });
    });
  });

  given('[case3] no file', () => {
    when('[t0] check is called with null', () => {
      then('it should throw', () => {
        expect(() => check(null, {} as any)).toThrow('no file found');
      });
    });
  });
});
