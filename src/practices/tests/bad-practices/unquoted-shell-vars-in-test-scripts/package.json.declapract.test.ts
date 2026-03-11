import { given, then, when } from 'test-fns';

import { check, fix } from './package.json.declapract';

describe('unquoted-shell-vars-in-test-scripts', () => {
  given('[case1] package.json with unquoted $RESNAP', () => {
    const contents = JSON.stringify(
      {
        scripts: {
          'test:unit':
            "jest -c ./jest.unit.config.ts $([ -n $RESNAP ] && echo '--updateSnapshot')",
        },
      },
      null,
      2,
    );

    when('[t0] checked', () => {
      then('bad practice is detected', () => {
        expect(() => check(contents, {} as any)).not.toThrow();
      });
    });

    when('[t1] fixed', () => {
      then('$RESNAP uses ${RESNAP:-} syntax', async () => {
        const { contents: fixed } = await fix(contents, {} as any);
        expect(fixed).toContain('[ -n "${RESNAP:-}" ]');
        expect(fixed).not.toContain('[ -n $RESNAP ]');
      });
    });
  });

  given('[case2] package.json with unquoted $THOROUGH', () => {
    const contents = JSON.stringify(
      {
        scripts: {
          'test:unit':
            "jest -c ./jest.unit.config.ts $([ -z $THOROUGH ] && echo '--changedSince=main')",
        },
      },
      null,
      2,
    );

    when('[t0] checked', () => {
      then('bad practice is detected', () => {
        expect(() => check(contents, {} as any)).not.toThrow();
      });
    });

    when('[t1] fixed', () => {
      then('$THOROUGH uses ${THOROUGH:-} syntax', async () => {
        const { contents: fixed } = await fix(contents, {} as any);
        expect(fixed).toContain('[ -z "${THOROUGH:-}" ]');
        expect(fixed).not.toContain('[ -z $THOROUGH ]');
      });
    });
  });

  given('[case3] package.json with multiple unquoted vars', () => {
    const contents = JSON.stringify(
      {
        scripts: {
          'test:unit':
            "jest $([ -z $THOROUGH ] && echo '--changedSince=main') $([ -n $RESNAP ] && echo '--updateSnapshot')",
          'test:integration':
            "jest $([ -z $THOROUGH ] && echo '--changedSince=main') $([ -n $RESNAP ] && echo '--updateSnapshot')",
        },
      },
      null,
      2,
    );

    when('[t0] fixed', () => {
      then('all vars use ${VAR:-} syntax', async () => {
        const { contents: fixed } = await fix(contents, {} as any);
        expect(fixed).toContain('[ -z "${THOROUGH:-}" ]');
        expect(fixed).toContain('[ -n "${RESNAP:-}" ]');
        expect(fixed).not.toContain('[ -z $THOROUGH ]');
        expect(fixed).not.toContain('[ -n $RESNAP ]');
      });
    });
  });

  given('[case4] package.json with quoted-without-default vars', () => {
    const contents = JSON.stringify(
      {
        scripts: {
          'test:unit':
            'jest $([ -z "$THOROUGH" ] && echo \'--changedSince=main\') $([ -n "$RESNAP" ] && echo \'--updateSnapshot\')',
        },
      },
      null,
      2,
    );

    when('[t0] checked', () => {
      then('bad practice IS detected (fails with set -u)', () => {
        expect(() => check(contents, {} as any)).not.toThrow();
      });
    });

    when('[t1] fixed', () => {
      then('vars use ${VAR:-} syntax', async () => {
        const { contents: fixed } = await fix(contents, {} as any);
        // in JSON, quotes are escaped as \"
        expect(fixed).toContain('[ -z \\"${THOROUGH:-}\\" ]');
        expect(fixed).toContain('[ -n \\"${RESNAP:-}\\" ]');
        expect(fixed).not.toContain('[ -z \\"$THOROUGH\\" ]');
        expect(fixed).not.toContain('[ -n \\"$RESNAP\\" ]');
      });
    });
  });

  given('[case5] package.json with safe ${VAR:-} syntax', () => {
    const contents = JSON.stringify(
      {
        scripts: {
          'test:unit':
            'jest $([ -z "${THOROUGH:-}" ] && echo \'--changedSince=main\') $([ -n "${RESNAP:-}" ] && echo \'--updateSnapshot\')',
        },
      },
      null,
      2,
    );

    when('[t0] checked', () => {
      then('bad practice is NOT detected', () => {
        expect(() => check(contents, {} as any)).toThrow(
          'no unsafe shell variables found',
        );
      });
    });
  });

  given('[case6] package.json with unquoted $CI', () => {
    const contents = JSON.stringify(
      {
        scripts: {
          'test:unit': "jest $([ -n $CI ] && echo '--ci')",
        },
      },
      null,
      2,
    );

    when('[t0] checked', () => {
      then('bad practice is detected', () => {
        expect(() => check(contents, {} as any)).not.toThrow();
      });
    });

    when('[t1] fixed', () => {
      then('$CI uses ${CI:-} syntax', async () => {
        const { contents: fixed } = await fix(contents, {} as any);
        expect(fixed).toContain('[ -n "${CI:-}" ]');
        expect(fixed).not.toContain('[ -n $CI ]');
      });
    });
  });

  given('[case7] package.json with quoted $CI (no default)', () => {
    const contents = JSON.stringify(
      {
        scripts: {
          'test:unit': 'jest $([ -n "$CI" ] && echo \'--ci\')',
        },
      },
      null,
      2,
    );

    when('[t0] checked', () => {
      then('bad practice is detected', () => {
        expect(() => check(contents, {} as any)).not.toThrow();
      });
    });

    when('[t1] fixed', () => {
      then('$CI uses ${CI:-} syntax', async () => {
        const { contents: fixed } = await fix(contents, {} as any);
        // in JSON, quotes are escaped as \"
        expect(fixed).toContain('[ -n \\"${CI:-}\\" ]');
        expect(fixed).not.toContain('[ -n \\"$CI\\" ]');
      });
    });
  });
});
