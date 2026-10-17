import { DomainEntity } from 'domain-objects';

export interface Transmission {
  id?: number;
  channel: string;
}
export class Transmission
  extends DomainEntity<Transmission>
  implements Transmission
{
  public static unique = ['channel'] as const;
}
