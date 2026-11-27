# F15 — a bare dash time id halts only with its zone

## .the fork

#845 names `hh-mm-ss-fffZ` with no date or T ahead. without the zone, the same shape is also a
part number or a serial (`nn-nn-nn-nnn`). two paths:

- halt a bare `hh-mm-ss-fff` with or without a zone
- halt it bare only with its zone; after a date, the zone is optional

## .taken

the zone. it matches the issue's own sketch (`...-[0-9]{3}Z`), and keeps a serial number legal.
a log id with a date ahead halts with or without the zone.

## .rework

clean: drop `(Z|z)` from the bare arm of `FORM_DASH_ID`; flip one pass row.

## .confidence

85%.

## .where

`FORM_DASH_ID` in the hook; pass row "a part number with a dash-id shape, no zone".

## .verdict

open.
