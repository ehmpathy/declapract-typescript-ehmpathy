# F16 — a masked clock halts while its hour keeps one real digit

## .the fork

a masked slot (`x` for a digit) still leaks the rest of the clock. at what point does a mask no
longer leak? two paths:

- halt any slot shape with an x, even an all-x placeholder (`xx:xx`)
- halt while the hour slot keeps one real digit; an all-x placeholder passes

## .taken

one real digit in the hour. `xx:xx` is a format hint, not a record. a lone T needs a join (`Thh-mx`)
so a ticket id (`T13x2`) passes. side effect: `0x:nn` halts, since `0x` reads as a masked hour.

## .rework

clean: widen or narrow `H24X` in the hook; flip the matched pass rows.

## .confidence

80%.

## .where

`H24X`, `MMX`, `FORM_MASKED` in the hook; pass rows "an all-x placeholder clock", "a masked
T-prefixed id".

## .verdict

open.
