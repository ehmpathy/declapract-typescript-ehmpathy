import { DomainEntity } from 'domain-objects';

export interface ChatThread {
  id?: number;
  uuid?: string;
  externalId: string;
}
export class ChatThread extends DomainEntity<ChatThread> implements ChatThread {
  public static unique = ['externalId'] as const;
}
