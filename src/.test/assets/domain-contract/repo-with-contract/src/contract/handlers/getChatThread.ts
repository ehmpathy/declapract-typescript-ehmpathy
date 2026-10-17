import { z } from 'zod';

import { ChatThread } from '@src/domain.objects/ChatThread';
import { Transmission } from '@src/domain.objects/Transmission';

const schemaInput = z.object({
  thread: ChatThread.contract.ref('primary'),
  transmission: Transmission.contract().ref('primary'),
});

const schemaOutput = z.object({
  thread: ChatThread.schema.nullable(),
  transmissions: z.array(Transmission.schema),
});

export const isThreadShaped = (input: unknown) =>
  ChatThread.schema.safeParse(input).success;

export const schema = { input: schemaInput, output: schemaOutput };
