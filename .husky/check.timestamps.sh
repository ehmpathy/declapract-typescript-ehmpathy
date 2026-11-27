#!/bin/bash

# .what = block commit of files that embed a time of day (any join, any anchor, any zone)
#         in ANY staged file — code and prose alike: sources, scripts, readmes, docs, briefs, yields
# .why  = a timestamp in a tracked file is a privacy leak that ships to every clone and fork,
#         forever; it also churns every diff
# .how  = scan every staged file for the pattern; halt with a constraint error (exit 2) if any
#         are found
#
# ⛔ NEVER ADD AN EXEMPTION TO THIS HOOK. NOT A PATH, NOT A DIR, NOT A FILE, NOT A PATTERN.
#    this hook exists to block EVERY timestamp in every tracked file. that is the whole point.
#    an exemption is how the leak gets back in — one dir today, every dir tomorrow.
#    a file that "needs" a timestamp removes it or masks it (e.g. `[timestamp]`). code that
#    needs a clock value builds it from parts at runtime, so no stamp sits in its source.
#    check.timestamps.lock.sh halts every commit if this file differs from the practice.
#
# the examples below are symbolic: h, m, s, and the date letters each stand for one digit

# fail fast on errors and unbound vars (safe here: the scan captures grep's exit, so a
# no-match does not abort and a fault halts loud; all vars are assigned before use)
set -eu

# a number is a clock when its SHAPE says so (a colon) or an ANCHOR vouches for it: a lead T,
# a date before, a zone or a meridiem after. shapes with no anchor that a non-clock shares
# (hh.mm decimals, hh-mm-ss dd-mm-yy dates, a bare hhmm year or port) pass on purpose.
# each form is a valid clock: hour 00-23 (1-12 with a meridiem), minute + second 00-59.
# posix ere only, no backrefs: the forms join by concatenation, so a backref would point
# at the wrong group.
H24='([01][0-9]|2[0-3])'
H12='(1[0-2]|0?[1-9])'
MM='[0-5][0-9]'
# a masked slot: a clock digit swapped for an x still leaks the rest of the clock. the hour
# slot keeps at least one real digit, so an all-x placeholder (xx:xx) passes
H24X='([01][0-9xX]|2[0-3xX]|[xX][0-9])'
MMX='[0-5xX][0-9xX]'
ZONE='(Z|[+-][0-9][0-9]:?[0-9][0-9])?'
ZONE_NAMED='(Z|z| ?(UTC|GMT|Utc|Gmt|utc|gmt|Zulu|zulu))'
DATE_ISO='[0-9]{4}-?[01][0-9]-?[0-3][0-9]'
MONTH='(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?'
# a date in any common order: yyyy-mm-dd, yyyymmdd, mm/dd/yyyy, dd.mm.yyyy, Mon dd, yyyy,
# dd Mon yyyy. a day- or month-first date needs no digit, dot, slash, or dash before it, so
# the tail of a year-first range (yyyy-mm-dd-yyyy-mm-dd) is not read as one
DATE_BEFORE="((^|[^0-9])([0-9]{4}[-/._][01][0-9][-/._][0-3][0-9]|[0-9]{4}[01][0-9][0-3][0-9])|(^|[^0-9./-])[0-3]?[0-9][-/.][0-3]?[0-9][-/.][0-9]{4}|(^|[^A-Za-z])(${MONTH} [0-3]?[0-9](st|nd|rd|th)?,? [0-9]{4}|[0-3]?[0-9](st|nd|rd|th)? ${MONTH},? [0-9]{4}))"
# token edges: no letter or digit beside the form, so a clock shape
# inside a hash, a base64 blob, or an id does not match
EDGE='(^|[^0-9A-Za-z])'
EDGE_END='([^0-9A-Za-z]|$)'

# the next three forms need no zone group: a zone opens with Z, +, or -, which the right
# edge (no digit after) already admits
# lead T, colon clock: Thh:mm, Thh:mm:ss.fffZ, Thh:mm+hh:mm
FORM_T_COLON="T${H24}:${MM}(:${MM})?([^0-9]|$)"
# lead T, dash clock (a filename-safe iso stamp): Thh-mm-ssZ, Thh-mmZ
FORM_T_DASH="T${H24}-${MM}(-${MM})?([^0-9]|$)"
# colon clock, one- or two-digit hour: hh:mm, h:mm, hh:mm:ss+hh:mm. the left edge forbids a
# digit or colon before the hour, so a `file.ts:ll:cc` line:col ref and a `pppp:pppp` port
# map pass; the right edge forbids a digit after, so a longer number never reads as a clock.
# a one-digit hour also needs no `[` before it, so a slice items[1:nn] passes; a bracketed
# log clock [hh:mm:ss] still halts
FORM_COLON="((^|[^0-9:])${H24}|(^|[^0-9:[])[0-9]):${MM}(:${MM})?([^0-9]|$)"
# colon clock with a named zone needs no left edge: the zone rules out a line:col ref (key:hh:mmZ)
FORM_COLON_ZONED="(^|[^0-9])${H24}:${MM}(:${MM})?${ZONE_NAMED}${EDGE_END}"
# any other join with a named zone: hhmmZ, hhmm UTC, hh-mm-ssZ, hhhmmZ, hh.mmZ. token edges keep
# hashes, base64, ids, and versions out
FORM_ZONED="(^|[^0-9A-Za-z.:-])T?${H24}[.hH-]?${MM}([.-]?${MM})?${ZONE_NAMED}${EDGE_END}"
# a date, then T and a basic or hour-only clock: yyyymmddThhmmssZ, yyyy-mm-ddThhmm, yyyy-mm-ddThh.
# its right edge forbids a dash (so a T-dash clock is left to FORM_T_DASH), so here the zone
# group is live: it admits a negative offset, yyyy-mm-ddThhmm-hhmm
FORM_DATE_T="${DATE_ISO}[Tt]${H24}(${MM}(${MM})?)?([.,][0-9]+)?${ZONE}([^0-9:-]|$)"
# a date, then a join, then an optional T and a clock in any join. joins: up to three blanks,
# underscores, or dashes; `, ` `: ` `; ` ` at ` ` @ ` ` (` ` ~`; or a spaced em dash, en dash,
# bar, or slash. yyyy-mm-dd hhmm, run.yyyy-mm-dd_hh-mm-ss.log, Mon dd, yyyy at hhmm,
# yyyy-mm-dd: hhmm, yyyy-mm-dd — hhmm, yyyy-mm-dd Thhmm. the right edge forbids a dash after, so
# a date range yyyy-mm-dd-yyyy-mm-dd passes, unless a second basic clock follows the dash, as in
# a time range yyyy-mm-dd hhmm-hhmm; a dot then a digit, so a version after a date passes;
# and a letter, so a unit or a hash glued to the number (yyyy-mm-dd hhmmms) passes
DATE_JOIN="(, |: |; | at | @ | \\(| ~| — | – | \\| | / |[[:blank:]_-]{1,3})"
FORM_DATE_CLOCK="${DATE_BEFORE}${DATE_JOIN}T?${H24}[:._-]?${MM}([:._-]?${MM})?(-${H24}${MM})?([^0-9A-Za-z.-]|\\.([^0-9]|$)|$)"
# an h or H between two-digit parts: hhhmm, hhHmm. edges keep a duration (hhhmmm) out
FORM_H_MARK="${EDGE}${H24}[hH]${MM}${EDGE_END}"
# a meridiem after a 12-hour clock in any join, or an hour alone: h:mm pm, hpm, hh a.m., hhmmpm.
# the right edge forbids a letter after, so `n PMs` passes
FORM_MERIDIEM="(^|[^0-9:])${H12}([:.hH-]?${MM}([:.-]?${MM})?)? ?[aApP]\.?[mM]\.?${EDGE_END}"
# iso end of day, hour 24 then zero minutes, when an anchor vouches for it: a lead T, a date
# before, or a named zone after. a bare one passes, as a score would.
# `[:]` is a plain colon, kept in a class so this source line holds no end-of-day stamp
FORM_END_OF_DAY="(${DATE_ISO}T24(:?00(:?00)?)?${ZONE}([^0-9]|$)|T24[:]00([:]00)?([^0-9]|$)|${DATE_BEFORE}[ _-]24[:.-]?00([:.-]?00)?([^0-9-]|$)|(^|[^0-9])24[:]00([:]00)?${ZONE_NAMED}${EDGE_END})"
# a masked clock: one or more digits swapped for an x, as in Thh-mx-ss or yyyy-mm-ddThxmm.
# a lead T needs a join, so a ticket id (Thhmm) passes; a date before needs none. a colon
# clock needs the same edges as FORM_COLON, plus no letter before. a zone may follow
FORM_MASKED="(T${H24X}[-:]${MMX}|${DATE_ISO}[Tt]${H24X}[-:]?${MMX}|(^|[^0-9A-Za-z:])${H24X}:${MMX})([-:]${MMX})?${ZONE}${EDGE_END}"
# a dash time id: hh-mm-ss-fff. bare, it needs its zone (hh-mm-ss-fffZ), so a part number
# nn-nn-nn-nnn passes; after a date and a join or T, the zone is optional. a bare hh-mm-ss
# (a dd-mm-yy date) still passes
FORM_DASH_ID="((^|[^0-9A-Za-z:-])${H24X}-${MMX}-${MMX}-[0-9xX]{3}(Z|z)|${DATE_ISO}[-_Tt]${H24X}-${MMX}-${MMX}-[0-9xX]{3}(Z|z)?)${EDGE_END}"

TIMESTAMP_PATTERN="${FORM_T_COLON}|${FORM_T_DASH}|${FORM_COLON}|${FORM_COLON_ZONED}|${FORM_ZONED}|${FORM_DATE_T}|${FORM_DATE_CLOCK}|${FORM_H_MARK}|${FORM_MERIDIEM}|${FORM_END_OF_DAY}|${FORM_MASKED}|${FORM_DASH_ID}"

# an iso-8601 DURATION is a fixed span, not an instant — a valid, stable value to assert on.
# a duration carries a lead `P` designator and a `T` with NO date part (PThh:mm:ss,
# PnDThh:mm:ss, PnYnMnDThh:mm:ss), unlike a stamp (yyyy-mm-ddThh:mm:ssZ). strip durations
# before the timestamp scan, so a duration-only line falls through and a line with a real
# stamp still halts (the stamp survives the strip). the left edge (group 1, kept by the strip)
# forbids a letter or digit before the P, so a word glued to a T clock (SEPThh:mm) is not read
# as a duration.
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

  # read the staged blob; fail loud if git cannot read it
  # (git's own stderr flows straight to the terminal, never into the scanned content)
  if ! content=$(git show ":$file"); then
    printf '💥 MalfunctionError: check.timestamps could not read the staged blob\n' >&2
    printf '   └─ %s\n' "$file" >&2
    exit 1
  fi

  # halt if the staged content embeds a raw timestamp. strip iso durations first (sed is
  # line-by-line, so line numbers are preserved): a duration-only line loses its clock run
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
