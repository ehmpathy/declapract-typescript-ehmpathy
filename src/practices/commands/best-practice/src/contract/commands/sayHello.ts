import { asCommand } from '@ehmpathy/as-command';
import { getResourceNameFromFileName } from 'visualogic';

import { access } from '../../utils/environment';
import { log } from '../../utils/logger';
import { COMMANDS_OUTPUT_DIRECTORY } from './__tmp__/directory';

const command = asCommand(
  {
    name: getResourceNameFromFileName(__filename),
    stage: access, // as-command names this field `stage`; it takes the access

    dir: COMMANDS_OUTPUT_DIRECTORY,
    log,
  },
  async () => console.log('hello world'),
);

// ACCESS=prod npx tsx src/contract/commands/sayHello.ts
if (require.main === module) void command({});
