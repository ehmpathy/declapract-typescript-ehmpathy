# F6 — new kinds and new provision paths stay open (#790, #792, #797, #798, #804)

## .the fork
- a: build each feature in this pr
- b: leave each open with a reason; this pr lands the defects an upgrade trips on

## .taken
b. the wish orders the defects first and asks for one pr, one release. each of these adds a surface (a new test kind, a build-once lane, an eas poll, a cpu-width bound, a plancheck gate) that needs its own blueprint and, for #790/#792, the F2 rename pass first. #798 itself asks for a commander-reviewed blueprint before code.

## .rework
clean. no code lands; each issue gets its reason.

## .confidence — 85%
#797 (eas poll) and #804 part 1 (always-on plancheck) are small enough to pull in; left out to keep the release about upgrade defects. the wisher may want them.

## .where
issues #790, #792, #797, #798, #804

## .verdict
— (awaits review)
