#!/bin/bash

# .what = block commit of files that embed a time of day (any join, any anchor, any zone)
#         in ANY staged file but .ts/.sh — prose included: readmes, docs, briefs, yields, dreams
# .why  = a timestamp in a tracked file is a privacy leak that ships to every clone and fork,
#         forever; it also churns every diff
# .how  = scan staged files (except .ts/.sh) for the pattern; halt with a
#         constraint error (exit 2) if any are found
#
# ⛔ NEVER ADD AN EXEMPTION TO THIS HOOK. NOT A PATH, NOT A DIR, NOT A FILE, NOT A PATTERN.
#    this hook exists to block EVERY timestamp in every tracked file. that is the whole point.
#    an exemption is how the leak gets back in — one dir today, every dir tomorrow.
#    a file that "needs" a timestamp removes it or masks it (e.g. `[timestamp]`, a fixed clock).
#    the .ts/.sh skip below is code that computes time, not data that records it; it may never
#    widen. check.timestamps.lock.sh halts every commit if this file differs from the practice.

# fail fast on errors and unbound vars (safe here: the scan captures grep's exit, so a
# no-match does not abort and a fault halts loud; all vars are assigned before use)
set -eu

# a number is a clock when its SHAPE says so (a colon) or an ANCHOR vouches for it: a lead T,
# a date before, a zone or a meridiem after. shapes with no anchor that a non-clock shares
# (14.30 decimals, 14-30-00 dd-mm-yy dates, a bare 1430 year or port) pass on purpose.
# each form is a valid clock: hour 00-23 (1-12 with a meridiem), minute + second 00-59.
# posix ere only, no backrefs: the forms join by concatenation, so a backref would point
# at the wrong group.
H24='([01][0-9]|2[0-3])'
H12='(1[0-2]|0?[1-9])'
MM='[0-5][0-9]'
ZONE='(Z|[+-][0-9][0-9]:?[0-9][0-9])?'
ZONE_NAMED='(Z|z| ?(UTC|GMT|Utc|Gmt|utc|gmt|Zulu|zulu))'
DATE_ISO='[0-9]{4}-?[01][0-9]-?[0-3][0-9]'
MONTH='(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?'
# a date in any common order: 2026-11-25, 20261125, 11/25/2026, 25.11.2026, Nov 25, 2026, 25 Nov 2026.
# a day- or month-first date needs no digit, dot, slash, or dash before it, so the tail of a
# year-first range (2026-11-25-2026-11-30) is not read as one
DATE_BEFORE="((^|[^0-9])([0-9]{4}[-/._][01][0-9][-/._][0-3][0-9]|[0-9]{4}[01][0-9][0-3][0-9])|(^|[^0-9./-])[0-3]?[0-9][-/.][0-3]?[0-9][-/.][0-9]{4}|(^|[^A-Za-z])(${MONTH} [0-3]?[0-9](st|nd|rd|th)?,? [0-9]{4}|[0-3]?[0-9](st|nd|rd|th)? ${MONTH},? [0-9]{4}))"
# token edges: no letter or digit beside the form, so a clock shape
# inside a hash, a base64 blob, or an id does not match
EDGE='(^|[^0-9A-Za-z])'
EDGE_END='([^0-9A-Za-z]|$)'

# the next three forms need no zone group: a zone opens with Z, +, or -, which the right
# edge (no digit after) already admits
# lead T, colon clock: T14:30, T14:30:00.123Z, T14:30+05:30
FORM_T_COLON="T${H24}:${MM}(:${MM})?([^0-9]|$)"
# lead T, dash clock (a filename-safe iso stamp): T14-30-00Z, T14-30Z
FORM_T_DASH="T${H24}-${MM}(-${MM})?([^0-9]|$)"
# colon clock, one- or two-digit hour: 14:30, 9:05, 14:30:00+05:00. the left edge forbids a
# digit or colon before the hour, so a `file.ts:12:34` line:col ref and a `5432:5432` port
# map pass; the right edge forbids a digit after, so a longer number never reads as a clock.
# a one-digit hour also needs no `[` before it, so a slice items[1:10] passes; a bracketed
# log clock [14:32:07] still halts
FORM_COLON="((^|[^0-9:])${H24}|(^|[^0-9:[])[0-9]):${MM}(:${MM})?([^0-9]|$)"
# colon clock with a named zone needs no left edge: the zone rules out a line:col ref (key:14:30Z)
FORM_COLON_ZONED="(^|[^0-9])${H24}:${MM}(:${MM})?${ZONE_NAMED}${EDGE_END}"
# any other join with a named zone: 1430Z, 1430 UTC, 14-30-00Z, 14h30Z, 14.30Z. token edges keep
# hashes, base64, ids, and versions out
FORM_ZONED="(^|[^0-9A-Za-z.:-])T?${H24}[.hH-]?${MM}([.-]?${MM})?${ZONE_NAMED}${EDGE_END}"
# a date, then T and a basic or hour-only clock: 20261125T143000Z, 2026-11-25T1430, 2026-11-25T14.
# its right edge forbids a dash (so a T-dash clock is left to FORM_T_DASH), so here the zone
# group is live: it admits a negative offset, 2026-11-25T1430-0500
FORM_DATE_T="${DATE_ISO}[Tt]${H24}(${MM}(${MM})?)?([.,][0-9]+)?${ZONE}([^0-9:-]|$)"
# a date, then a join, then an optional T and a clock in any join. joins: up to three blanks,
# underscores, or dashes; `, ` `: ` `; ` ` at ` ` @ ` ` (` ` ~`; or a spaced em dash, en dash,
# bar, or slash. 2026-11-25 1430, run.2026-11-25_14-30-00.log, Nov 25, 2026 at 1430,
# 2026-11-25: 1430, 2026-11-25 — 1430, 2026-11-25 T1430. the right edge forbids a dash after, so
# a date range 2026-11-25-2026-11-30 passes, unless a second basic clock follows the dash, as in
# a time range 2026-11-25 1430-1500; a dot then a digit, so a version 2026-11-25 20.11.0 passes;
# and a letter, so a unit or a hash glued to the number (2026-11-25 1430ms) passes
DATE_JOIN="(, |: |; | at | @ | \\(| ~| — | – | \\| | / |[[:blank:]_-]{1,3})"
FORM_DATE_CLOCK="${DATE_BEFORE}${DATE_JOIN}T?${H24}[:._-]?${MM}([:._-]?${MM})?(-${H24}${MM})?([^0-9A-Za-z.-]|\\.([^0-9]|$)|$)"
# an h or H between two-digit parts: 14h30, 14H30. edges keep a 10h30m duration out
FORM_H_MARK="${EDGE}${H24}[hH]${MM}${EDGE_END}"
# a meridiem after a 12-hour clock in any join, or an hour alone: 1:42 pm, 9pm, 11 a.m., 1142pm.
# the right edge forbids a letter after, so `3 PMs` passes
FORM_MERIDIEM="(^|[^0-9:])${H12}([:.hH-]?${MM}([:.-]?${MM})?)? ?[aApP]\.?[mM]\.?${EDGE_END}"
# iso end of day, hour 24 with zero minutes, when an anchor vouches for it: T24:00,
# 2026-11-25T24:00Z, 2026-11-25 24:00, 24:00 UTC. a bare 24:00 passes, as a score would
FORM_END_OF_DAY="(${DATE_ISO}T24(:?00(:?00)?)?${ZONE}([^0-9]|$)|T24:00(:00)?([^0-9]|$)|${DATE_BEFORE}[ _-]24[:.-]?00([:.-]?00)?([^0-9-]|$)|(^|[^0-9])24:00(:00)?${ZONE_NAMED}${EDGE_END})"

TIMESTAMP_PATTERN="${FORM_T_COLON}|${FORM_T_DASH}|${FORM_COLON}|${FORM_COLON_ZONED}|${FORM_ZONED}|${FORM_DATE_T}|${FORM_DATE_CLOCK}|${FORM_H_MARK}|${FORM_MERIDIEM}|${FORM_END_OF_DAY}"

# an iso-8601 DURATION is a fixed span, not an instant — a valid, stable value to assert on.
# a duration carries a lead `P` designator and a `T` with NO date part (PT12:30:00,
# P1DT02:15:30, P3Y6M4DT12:30:05), unlike a stamp (2026-08-08T14:30:00Z). strip durations
# before the timestamp scan, so a duration-only line falls through and a line with a real
# stamp still halts (the stamp survives the strip). the left edge (group 1, kept by the strip)
# forbids a letter or digit before the P, so a word such as SEPT14:30 is not read as a duration.
DURATION_PATTERN='(^|[^A-Za-z0-9])P([0-9]+[YMWD])*T([0-9]+[HMS])*[0-9][0-9]:[0-9][0-9](:[0-9][0-9])?'

# collect staged files (added/copied/modified); skip deletions
# core.quotepath=off emits a non-ascii path raw, so `git show` below can read it
staged=$(git -c core.quotepath=off diff --cached --name-only --diff-filter=ACM)

# scan each staged file for a raw timestamp
# note: the here-doc feeds the loop in the current shell (no pipe subshell),
#       so `exit 2` halts the commit directly and a clean pass falls through
while IFS= read -r file; do
  # skip empty lines
  [ -n "$file" ] || continue

  # skip exempt code files (.ts and .sh legitimately carry time logic)
  case "$file" in
    *.ts | *.sh) continue ;;
  esac

  # read the staged blob; fail loud if git cannot read it
  # (git's own stderr flows straight to the terminal, never into the scanned content)
  if ! content=$(git show ":$file"); then
    printf '💥 MalfunctionError: check.timestamps could not read the staged blob\n' >&2
    printf '   └─ %s\n' "$file" >&2
    exit 1
  fi

  # halt if the staged content embeds a raw timestamp. strip iso durations first (sed is
  # line-by-line, so line numbers are preserved): a duration-only line loses its HH:MM:SS run
  # and falls through; a line that also holds a real stamp still matches (the stamp wins)
  # grep exits 1 on no match, 2 on a fault (a pattern it cannot compile): a fault must halt,
  # never read as a clean pass, else a broken pattern disables the guard. both run in the C
  # locale, byte by byte: in a utf-8 locale, one byte that is not utf-8 makes grep read the file
  # as binary, and -I would skip it whole
  if ! stripped=$(printf '%s\n' "$content" | LC_ALL=C sed -E "s/$DURATION_PATTERN/\1/g"); then
    printf '💥 MalfunctionError: check.timestamps could not strip durations; the pattern is broken\n' >&2
    printf '   └─ %s\n' "$file" >&2
    exit 1
  fi
  status=0
  matches=$(printf '%s\n' "$stripped" | LC_ALL=C grep -nIE "$TIMESTAMP_PATTERN") || status=$?
  if [ "$status" -gt 1 ]; then
    printf '💥 MalfunctionError: check.timestamps could not run its pattern; the guard is broken\n' >&2
    printf '   └─ %s (grep exit %s)\n' "$file" "$status" >&2
    exit 1
  fi
  match=$(printf '%s\n' "$matches" | head -n 1)
  if [ -n "$match" ]; then
    printf '✋ ConstraintError: timestamps are forbidden in tracked files, prose and docs included. remove them, zero exceptions\n' >&2
    printf '   ├─ why: a timestamp is a privacy leak, and churns every diff\n' >&2
    printf '   └─ %s:%s\n' "$file" "$match" >&2
    exit 2
  fi
done <<EOF
$staged
EOF
