# F17 — which characters count as a mask in a clock slot

## .the fork

pr #843 review asked that any non-digit mask (not only x) halt. read literally, "any non-digit"
halts common non-clocks that share the slot shape. two paths:

- any non-digit counts as a mask
- any character counts, minus a set that non-clocks share

## .taken

the minus set:
- hex letters a-f / A-F: a mac address, ipv6, hex ids
- blanks and the clock joins `:` `.` `-`
- punctuation that ends a phrase or a cell: `)` `]` `}` `>` `|` `,` `;` `!` `'` `"` and the backtick
- `+` and `=`: an offset or an assignment after a minute

a multibyte character is one mask. a letter g-z other than x masks only after a real digit in its
slot, so `v1:on` passes. the F16 guard holds: the hour keeps one real digit, so `**:**` passes. the
F15 guard holds: a bare dash time id needs its zone, so `12-34-56-7**` passes.

## .the cost

a bold verse ref (`**cc:v**`, chapter cc, verse v) reads as a clock plus a mask and halts; it is
pinned as a halt row (this note cannot quote it raw, since the hook scans this file). a
read of all 2650 tracked files halts the same 9 files as before, all clocks already on main.

## .rework

clean: one character class per path in the hook (`MASK_ANY`, `MASK_LEAD`); flip the matched rows.

## .confidence

75%: the commander may want hex letters in, or the bold verse ref out.

## .where

`MASK_ANY`, `MASK_LEAD`, `H24X`, `MMX`, `FFFX` in the hook; pr #843 thread on issue comment
7220455928; the plan reply is issue comment 7220516307.

## .verdict

open.
