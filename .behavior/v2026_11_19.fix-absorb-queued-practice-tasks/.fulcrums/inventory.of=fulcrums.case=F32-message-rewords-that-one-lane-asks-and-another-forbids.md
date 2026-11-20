# F32 — message rewords one lane asks for and another forbids

## .the fork
- (a) restore the prior halt text and snaps, as the test-intent lane (r12, i004 blocker.1–8) asks, since no queued issue names each reword
- (b) keep the rewords, which the snapshot-blemish lane (r11, i003 + i004) asked for, and hand the clash to the council

## .taken — (b)
the two lanes demand opposites on one set of lines. r11 graded each prior message a blemish (jargon, a fix with no pointer, a header that mixed two instructions); r12 grades each repair an unasked intent change. to restore (a) re-opens every r11 point; to hold (b) keeps r12's. neither lane outranks the other, so the call is the council's.

| r12 i004 point | the line | which r11 point asked for it |
|---|---|---|
| blocker.1 | timestamp halt: header, why, fix tree; `file: <path>:<line>` with no line text | i003 r11 nitpick (halt leaves read `fix:`); the line text is withheld because it may hold a key and this halt prints before the secrets scan (#802) |
| blocker.2 | secrets halt: `├─ file:` and a split header | i003 r11 nitpick (halt leaves read `fix:`) |
| blocker.3 | lock halt: [t2] header and `git add` fix, [t6] header, [t4] slice from `💥` | i003 r11 nitpick (lock fix); i004 r11 nitpick.2 and nitpick.3. the [t2] fix is `git add` because the hook on disk already matches: a `declapract apply` there changes no byte and the commit still halts. the [t4] slice drops git's own `fatal:` line, which varies by git version |
| blocker.4 | testdb probe: tree layout | i003 r11 nitpick (psql header); #787 |
| blocker.5 | `getOneKeyrackEnvForAcceptance`: context block | #788.6; only a repeat was cut: the old line said `for a cloud acceptance run` twice, and the header still says it once (`useKeyrack.ts:383`) |
| blocker.6 | livedb wake warn: a tree | i003 r11 nitpick (wake warn); the old `{"status":1}` cause still prints, as `the command exited with status 1`. the parse-failure `cause` is withheld on purpose: the parse engine's text can quote the secret it failed to read (`livedb-wake-branches` :178) |
| blocker.7 | port override: absent file names itself | i003 r11 nitpick (absent config leaks node's words) |
| blocker.8 | slow-test `::error::💥 MalfunctionError:` prefix | `rule.require.qualified-error-headers`; i003 r11 nitpick |

## .rework — clean
each reword is one string and its snap; a restore is the same edit in reverse, with no caller

## .confidence — 80%
low because two reviewers hold opposite, defensible lines, and only the council can rank them

## .where
- `.reviews/peer/5.3.verification._.review.i004.c1ab77fe5a2b2a5424.r012._.given.by_peer.enroll-verif-test-intent.md`
- `.reviews/peer/5.3.verification._.review.i004.c1ab77fe5a2b2a5424.r011._.given.by_peer.enroll-verif-snapshot-blemishes.md`

## .verdict
open — fulcrum council at the end of the route
