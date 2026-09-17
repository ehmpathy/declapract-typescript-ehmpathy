import Joi from 'joi';

// a joi schema — the shape-for-shape rewrite to zod makes three silent semantic
// changes a regex cannot get right, so the fix prepends a loud review marker.
export const widgetSchema = Joi.object({
  name: Joi.string().required(),
  count: Joi.number(),
  createdAt: Joi.date(),
});
