# git-merge-packagejson

a git merge driver that auto-resolves package.json dependency version conflicts via semver rules.

## install

```sh
npm install --save-dev git-merge-packagejson
```

## setup

### 1. configure git

run the install command to configure git to use the merge driver:

```sh
npx git-merge-packagejson --install
```

this configures:
- `merge.npm-packagejson-merge.name` = "npm package.json merge driver"
- `merge.npm-packagejson-merge.driver` = "npx git-merge-packagejson %O %A %B %P"

### 2. configure .gitattributes

add to your `.gitattributes` file:

```
package.json merge=npm-packagejson-merge
```

## how it works

when git encounters a merge conflict in package.json, this driver:

1. **picks higher semver version** - when the same dependency is updated in both branches, the higher version wins
2. **unions additions** - dependencies added in either branch are preserved
3. **honors removal intent** - when a dep is removed in one branch and updated in the other, removal wins
4. **resolves only dependency sections** - only handles `dependencies`, `devDependencies`, `peerDependencies`, and `optionalDependencies`
5. **preserves non-dep conflicts** - leaves conflict markers in other fields (scripts, version, etc.) for human review

## exit codes

- `0` - fully resolved, no conflicts left
- `1` - partially resolved, non-dependency conflicts remain
- `>128` - error (invalid json, file not found, etc.)

## programmatic usage

```ts
import { mergePackageJson } from 'git-merge-packagejson';

const result = mergePackageJson({
  baseContent: '{"dependencies": {"lodash": "4.17.20"}}',
  oursContent: '{"dependencies": {"lodash": "4.17.21"}}',
  theirsContent: '{"dependencies": {"lodash": "4.17.22"}}',
});

console.log(result.merged);
// {"dependencies": {"lodash": "4.17.22"}}

console.log(result.hasConflictsLeft);
// false
```

## examples

### version conflict

```
base:   lodash: "4.17.20"
ours:   lodash: "4.17.21"
theirs: lodash: "4.17.22"
result: lodash: "4.17.22"  ← higher version wins
```

### union additions

```
base:   (none)
ours:   axios: "1.0.0"
theirs: express: "4.18.0"
result: axios: "1.0.0", express: "4.18.0"  ← both preserved
```

### removal wins

```
base:   lodash: "4.17.20"
ours:   (removed)
theirs: lodash: "4.17.22"
result: (removed)  ← removal intent honored
```

### pre-release vs stable

```
base:   pkg: "1.0.0-beta.1"
ours:   pkg: "1.0.0-beta.2"
theirs: pkg: "1.0.0"
result: pkg: "1.0.0"  ← stable wins over pre-release
```

## special versions

non-semver versions are treated as incomparable:
- `latest` - preserved as-is
- `file:../local` - preserved as-is
- `workspace:^` - preserved as-is
- `git+https://...` - preserved as-is

for incomparable version comparisons, `ours` is preferred (the current branch).

## license

MIT
