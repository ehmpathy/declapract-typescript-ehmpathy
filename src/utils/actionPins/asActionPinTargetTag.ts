/**
 * .what = the tag a pinned action should move to, chosen from the tags its repo publishes
 * .why  = the bump stays inside the pinned major, so a scheduled bump never ships a break
 *         a human did not choose (#556). the rules:
 *           - a major-only tail (`v4`) names a tag that moves; keep it, and re-read its commit
 *           - a full tail (`v4.1.2`, `0.2.0`) moves to the newest full tag of the same major
 *           - a tail that is not a version (`main`, a date) stays as it is
 * .note = a prerelease (`v5.0.0-rc.1`) never qualifies — only `x.y.z`, with the same `v` prefix
 */
export const asActionPinTargetTag = (input: {
  tagPinned: string;
  tagsAvailable: string[];
}): string => {
  const pinned = asTagVersion({ tag: input.tagPinned });

  // a non-version tail, or a major-only tail, re-reads the same tag
  if (!pinned || pinned.minor === null) return input.tagPinned;

  // the newest full tag of the same prefix and major
  const newest = input.tagsAvailable
    .map((tag) => ({ tag, version: asTagVersion({ tag }) }))
    .filter(
      (row) =>
        row.version !== null &&
        row.version.minor !== null &&
        row.version.patch !== null &&
        row.version.prefix === pinned.prefix &&
        row.version.major === pinned.major,
    )
    .sort((a, b) => asVersionRank({ version: b.version! }) - asVersionRank({ version: a.version! }))[0];

  // never move backward
  if (!newest) return input.tagPinned;
  if (asVersionRank({ version: newest.version! }) < asVersionRank({ version: pinned }))
    return input.tagPinned;
  return newest.tag;
};

interface TagVersion {
  prefix: string;
  major: number;
  minor: number | null;
  patch: number | null;
}

/**
 * .what = the version parts of a tag, or null when the tag is not a version
 */
const asTagVersion = (input: { tag: string }): TagVersion | null => {
  const parts =
    /^(?<prefix>v?)(?<major>\d+)(?:\.(?<minor>\d+))?(?:\.(?<patch>\d+))?$/.exec(
      input.tag,
    )?.groups;
  if (!parts) return null;
  return {
    prefix: parts.prefix ?? '',
    major: Number(parts.major),
    minor: parts.minor === undefined ? null : Number(parts.minor),
    patch: parts.patch === undefined ? null : Number(parts.patch),
  };
};

/**
 * .what = one sortable number per version, within a major
 */
const asVersionRank = (input: { version: TagVersion }): number =>
  (input.version.minor ?? 0) * 1_000_000 + (input.version.patch ?? 0);
