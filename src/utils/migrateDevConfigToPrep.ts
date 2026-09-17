/**
 * .what = migrate a `config/dev.json`'s ONE unambiguous tier token from `dev` to `prep`: the
 *         `"access": "dev"` key. every HOST value is preserved verbatim.
 * .why  = ONE source for the two `old-dev-config-location` declarers (config +
 *         persist-with-rds), so the tier-migration cannot drift between them —
 *         mirrors `defineExpectedGitignoreContents` / `isDeferredToDeprecatedDirMove`.
 *         both declarers relocate `config/dev.json` → `config/prep.json` and migrate
 *         the access; this holds the shared byte-identical core so a future edit
 *         touches one place, never two that drift.
 *
 *         ONLY the `access` key migrates. the `access` KEY names the axis, so its value is
 *         known: `"access": "dev"` → `"access": "prep"`. no guess.
 *
 *         a HOST is NEVER rewritten — this util runs on a CONSUMER's real `config/dev.json`,
 *         whose host values are the consumer's own. a `.dev` label is axis-ambiguous WHEREVER
 *         it sits: `auth.myapp.dev` may be a public `.dev` gTLD or an internal tier host, and
 *         `api.dev.paypal.com` carries a mid-dotted `dev` that is a FOREIGN host's own label,
 *         not a tier segment. the migration cannot tell a tier host from a foreign host by
 *         structure, so per the wish's guard #3 (a rewrite that cannot verify its output must
 *         NOT guess) it rewrites NO host at all — the earlier mid-dotted rewrite guessed one
 *         position over from the terminal case, and silently corrupted a foreign public host
 *         (`api.dev.paypal.com` → `api.prep.paypal.com`) whose only signal was a human reading
 *         the apply diff. dropping it applies guard #3 uniformly.
 *
 *         the residual: a consumer whose OWN tier host is a bare `.dev` (`mydb.dev`) keeps it
 *         after the migrate, so it must set the prep host by hand. that is correct by guard #3
 *         — the util cannot know the consumer's prep host (the real template keys it as a
 *         `@declapract{variable.databaseClusterHost.prep}`, a per-consumer value), so host
 *         migration is out of this util's scope. a stranded tier host fails LOUD at connect
 *         time (a connection error, never silent wrong data), and the apply diff shows the
 *         access flip so the host review is visible.
 *
 *         why no review marker: an earlier shape appended a `@declapract:review` marker INTO
 *         the host value. that corrupted the value (a broken host string), and both declarers
 *         gate on `FileCheckType.EXISTS`, which never reads content — so a `declapract fix`
 *         left the file with a corrupt value while `declapract plan` read CLEAN, the exact
 *         silent-break class this whole wish exists to retire. the config file is JSON, which
 *         admits no comment, so a plan-visible marker is impossible here; the migration instead
 *         does only what it can verify (the `access` key) and rewrites no value it cannot.
 */
export const migrateDevConfigToPrep = (input: { contents: string }): string =>
  // the access itself — the ONE unambiguous key/value (the `access` key names the axis).
  // GLOBAL: a config with more than one `"access": "dev"` (a per-section or per-environment
  // override) migrates EVERY occurrence, not just the first — a non-global replace left the rest
  // silently `dev` and could not converge (a re-run's first-only match no-ops on the already-`prep`
  // key). idempotent: once rewritten, a re-run finds no `"access": "dev"` to match. no host is touched.
  input.contents.replace(/"access":\s*"dev"/g, '"access": "prep"');
