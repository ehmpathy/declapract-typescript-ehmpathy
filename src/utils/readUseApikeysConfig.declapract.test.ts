import fs from 'fs';
import os from 'os';
import path from 'path';
import util from 'util';

import { given, then, when } from 'test-fns';

import { readUseApikeysConfig } from './readUseApikeysConfig';

describe('readUseApikeysConfig', () => {
  given('a project root directory', () => {
    when('use.apikeys.json exists with valid content', () => {
      then('it should return the parsed config', async () => {
        // create temp directory with config file
        const tempDir = await util.promisify(fs.mkdtemp)(
          path.join(os.tmpdir(), 'readUseApikeysConfig-'),
        );
        const configDir = path.join(
          tempDir,
          '.agent/repo=.this/role=any/skills',
        );
        await util.promisify(fs.mkdir)(configDir, { recursive: true });
        const configPath = path.join(configDir, 'use.apikeys.json');
        await util.promisify(fs.writeFile)(
          configPath,
          JSON.stringify({
            apikeys: {
              required: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'],
            },
          }),
        );

        // read config
        const result = await readUseApikeysConfig({
          projectRootDirectory: tempDir,
        });

        // verify
        expect(result).toEqual({
          apikeys: {
            required: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'],
          },
        });

        // cleanup
        await util.promisify(fs.rm)(tempDir, { recursive: true });
      });
    });

    when('use.apikeys.json does not exist', () => {
      then('it should return null', async () => {
        // create temp directory without config file
        const tempDir = await util.promisify(fs.mkdtemp)(
          path.join(os.tmpdir(), 'readUseApikeysConfig-'),
        );

        // read config
        const result = await readUseApikeysConfig({
          projectRootDirectory: tempDir,
        });

        // verify
        expect(result).toBeNull();

        // cleanup
        await util.promisify(fs.rm)(tempDir, { recursive: true });
      });
    });

    when('use.apikeys.json contains malformed json', () => {
      then('it should return null gracefully', async () => {
        // create temp directory with malformed config file
        const tempDir = await util.promisify(fs.mkdtemp)(
          path.join(os.tmpdir(), 'readUseApikeysConfig-'),
        );
        const configDir = path.join(
          tempDir,
          '.agent/repo=.this/role=any/skills',
        );
        await util.promisify(fs.mkdir)(configDir, { recursive: true });
        const configPath = path.join(configDir, 'use.apikeys.json');
        await util.promisify(fs.writeFile)(configPath, '{ invalid json }');

        // read config
        const result = await readUseApikeysConfig({
          projectRootDirectory: tempDir,
        });

        // verify
        expect(result).toBeNull();

        // cleanup
        await util.promisify(fs.rm)(tempDir, { recursive: true });
      });
    });
  });
});
