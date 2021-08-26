import Joi from 'joi';
import { createStandardHandler } from 'simple-lambda-handlers';
import { HasUuid } from 'simple-type-guards';
import { CoolThing } from '../../domain';

import { doCoolThing } from '../../logic/doCoolThing';
import { log } from '../../utils/logger';

const schema = Joi.object().keys({
  doIt: Joi.boolean().required(),
});
export const handle = async ({ doIt }: { doIt: boolean }): Promise<{ coolThing: HasUuid<CoolThing> }> => {
  if (doIt) await doCoolThing();
  return { coolThing: {} as HasUuid<CoolThing> };
};

// export the handler
export const handler = createStandardHandler({
  log,
  schema,
  logic: handle,
});
