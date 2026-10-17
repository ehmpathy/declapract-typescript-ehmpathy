import { readFileSync } from 'node:fs';
import path from 'node:path';

import { given, then, when } from 'test-fns';
import { parse } from 'yaml';

/**
 * .what = clamps on the expo start/proxy commands and the web deploy compile step: each names
 *         the access it builds with, and each proxy waits on its target
 * .why  = `start:cold:prep` and `start:cold:prod` were byte-identical and both reached prod
 *         (#620, #653); the deploy compile step held `inputs.access` and dropped it (#619); and a
 *         proxy that starts before its target listens hangs every request (#676). none of that
 *         is visible to a green typecheck or build, so these clamps read the shipped templates.
 * .note = a filesystem read of the templates → integration grain, per
 *         rule.forbid.unit.remote-boundaries; no credential, no network
 */

/**
 * .what = the npm run commands and devDependencies the template declares
 * .why  = one read of the shipped template, named by what the clamps consume
 */
const getTemplateCommands = (): {
  commands: Record<string, string>;
  devDependencies: Record<string, string>;
} => {
  const template = JSON.parse(
    readFileSync(path.join(__dirname, 'best-practice/package.json'), 'utf-8'),
  );
  return {
    commands: template.scripts ?? {},
    devDependencies: template.devDependencies ?? {},
  };
};

/**
 * .what = the access a command sets inline (`ACCESS=<access> …`), or null where it sets none
 * .why  = names the read so each clamp states which access a command builds with
 */
const asAccessOfCommand = (input: { command: string }): string | null =>
  /(?:^|\s)ACCESS=([a-z]+)\b/.exec(input.command)?.[1] ?? null;

/**
 * .what = the `--target` port a local-ssl-proxy command forwards to
 * .why  = names the read so the wait-on clamp can pair each proxy with its own target
 */
const asProxyTargetPort = (input: { command: string }): string | null =>
  /local-ssl-proxy .*--target (\d+)/.exec(input.command)?.[1] ?? null;

describe('cicd-app-react-native-expo package.json — access + proxy clamps', () => {
  given('[case1] the shipped start commands', () => {
    const { commands, devDependencies } = getTemplateCommands();

    when('[t0] each cold build is paired with its hot twin (#653)', () => {
      const envsCold = Object.keys(commands)
        .map((name) => /^start:cold:([a-z]+)$/.exec(name)?.[1] ?? null)
        .filter((env): env is string => env !== null && env !== 'proxy');

      then('both access envs have a cold build', () => {
        expect([...envsCold].sort()).toEqual(['prep', 'prod']);
      });

      then('each start:cold:<env> sets the same ACCESS as its start:hot:<env>, and that ACCESS is <env>', () => {
        for (const env of envsCold) {
          const accessCold = asAccessOfCommand({
            command: commands[`start:cold:${env}`] ?? '',
          });
          const accessHot = asAccessOfCommand({
            command: commands[`start:hot:${env}`] ?? '',
          });
          expect({ env, accessCold }).toEqual({ env, accessCold: env });
          expect({ env, accessHot }).toEqual({ env, accessHot: env });
        }
      });

      then('start:cold:prep and start:cold:prod differ (#620)', () => {
        expect(commands['start:cold:prep']).not.toEqual(
          commands['start:cold:prod'],
        );
      });
    });

    when('[t1] each proxy gates on its target port (#676)', () => {
      const proxies = Object.entries(commands).filter(([, command]) =>
        command.includes('local-ssl-proxy'),
      );

      then('there is a hot and a cold proxy', () => {
        expect(proxies.map(([name]) => name).sort()).toEqual([
          'start:cold:proxy',
          'start:hot:proxy',
        ]);
      });

      then('each proxy waits on tcp:<its own target> before it listens', () => {
        for (const [name, command] of proxies) {
          const port = asProxyTargetPort({ command });
          expect({ name, port }).toEqual({ name, port: expect.any(String) });
          expect({
            name,
            gated: command.startsWith(`wait-on tcp:${port} && `),
          }).toEqual({ name, gated: true });
        }
      });

      then('wait-on is a declared devDependency', () => {
        expect(devDependencies['wait-on']).toBeDefined();
      });

      then('no command echoes a run in place of the run itself (#620)', () => {
        for (const command of Object.values(commands))
          expect(command.startsWith('echo npm run')).toEqual(false);
      });
    });

    when('[t2] the start commands are snapshotted for review', () => {
      then('the start:* commands match snapshot', () => {
        const starts = Object.fromEntries(
          Object.entries(commands).filter(([name]) => name.startsWith('start:')),
        );
        expect(starts).toMatchSnapshot('start:* commands');
      });
    });
  });

  given('[case2] the deploy workflow web compile step (#619)', () => {
    const workflow = parse(
      readFileSync(
        path.join(__dirname, 'best-practice/.github/workflows/.deploy-expo.yml'),
        'utf-8',
      ),
    );
    const steps: {
      name?: string;
      run?: string;
      env?: Record<string, string>;
    }[] = workflow.jobs['deploy-web'].steps;
    const compile = steps.find((step) => step.name === 'compile');

    when('[t0] the web compile step runs', () => {
      then('it runs build:web', () => {
        expect(compile?.run).toEqual('npm run build:web');
      });

      then('its env passes ACCESS from the access input', () => {
        expect(compile?.env?.ACCESS).toEqual('${{ inputs.access }}');
      });
    });
  });
});
