# F19 — #645: the terraform-formatter bad-practice lives in `format`

- **fork:** home the key-delete bad-practice in `terraform-common` (the practice that shipped the
  keys) or in `format` (the practice that chains them).
- **taken:** `format`. terraform-common leaves with terraform (seed S1); a bad-practice there would
  leave with it and stop to clean adopters that upgrade late. format is core and stays.
- **rework:** clean — a directory move.
- **confidence 75%, low because:** a reader looks for terraform cleanup under terraform-common first.
- **where:** `format/bad-practices/terraform-formatter/package.json.declapract.ts` (new).
- **verdict:** —
