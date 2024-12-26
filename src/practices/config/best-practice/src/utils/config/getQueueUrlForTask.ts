import { paramCase } from 'change-case';
import { DomainObject } from 'domain-objects';
import type { AsyncTask } from 'simple-async-tasks';

import { getConfig } from './getConfig';

export type ClassOf<T> = new (...args: any[]) => T;

export const getQueueUrlForTask = async (
  task: ClassOf<DomainObject<AsyncTask>>,
) => {
  const config = await getConfig();
  const taskName = task.name;
  return [
    'https://sqs.us-east-1.amazonaws.com',
    `/${config.aws.account}/`,
    `${config.project}-${config.environment.access}-${paramCase(taskName)}-llq`,
  ].join('');
};
