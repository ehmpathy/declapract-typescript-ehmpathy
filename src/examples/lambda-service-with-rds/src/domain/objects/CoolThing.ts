import { DomainEntity } from 'domain-objects';
import Joi from 'joi';

const schema = Joi.object().keys({
  id: Joi.number().optional(),
  uuid: Joi.string().uuid().optional(),
  name: Joi.string().required(),
});

/**
 * CoolThing is an example domain object
 * TODO: replace this
 */
export interface CoolThing {
  id?: number;
  uuid?: string;
  name: string;
}
export class CoolThing extends DomainEntity<CoolThing> implements CoolThing {
  public static unique = ['name'];
  public static updatable = [];
  public static schema = schema;
}
