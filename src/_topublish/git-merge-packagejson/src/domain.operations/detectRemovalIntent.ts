/**
 * .what = detect if a dependency was removed in one branch
 * .why = honor removal intent per the wish criteria
 */
export const detectRemovalIntent = (input: {
  depName: string;
  base: Record<string, string> | undefined;
  ours: Record<string, string> | undefined;
  theirs: Record<string, string> | undefined;
}): { removed: boolean; removedIn: 'ours' | 'theirs' | 'both' | null } => {
  const { depName, base, ours, theirs } = input;

  const inBase = base?.[depName] !== undefined;
  const inOurs = ours?.[depName] !== undefined;
  const inTheirs = theirs?.[depName] !== undefined;

  // if not in base, it was added — not a removal
  if (!inBase) {
    return { removed: false, removedIn: null };
  }

  // was in base, now check where it was removed
  const removedInOurs = !inOurs;
  const removedInTheirs = !inTheirs;

  if (removedInOurs && removedInTheirs) {
    return { removed: true, removedIn: 'both' };
  }
  if (removedInOurs) {
    return { removed: true, removedIn: 'ours' };
  }
  if (removedInTheirs) {
    return { removed: true, removedIn: 'theirs' };
  }

  // still present in both branches
  return { removed: false, removedIn: null };
};
