import { asCommand } from '@ehmpathy/as-command';
import { UnexpectedCodePathError } from '@ehmpathy/error-fns';
import { ProcedureInput, getResourceNameFromFileName } from 'visualogic';

import { stage } from '../../utils/environment';
import { log } from '../../utils/logger';
import { COMMANDS_OUTPUT_DIRECTORY } from './__tmp__/directory';

const command = asCommand(
  {
    name: getResourceNameFromFileName(__filename),
    stage,
    dir: COMMANDS_OUTPUT_DIRECTORY,
    log,
  },
  async () => console.log('hello world'),
);

// STAGE=prod npx tsx src/contract/commands/sayHello.ts
if (require.main === module) void command({});
