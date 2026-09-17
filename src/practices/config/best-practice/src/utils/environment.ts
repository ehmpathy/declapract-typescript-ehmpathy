// note = a placeholder boundary. this practice only checks that the file EXISTS (it never
//        checks its contents); the `environments` practice is the sole real declarer of
//        `src/utils/environment.ts` and supplies the typed exports. this stub exists solely so
//        the declared acceptance test file type-checks in a consumer that has `config` but not
//        yet `environments`. removal path = when a consumer converges the `environments`
//        practice, its real file overwrites this stub. the exports are typed `string` — no cast:
//        the real `access` export is a tier string, so `string` is the honest widened type here
//        and needs no `as`.
export const access: string = 'placeholder';
