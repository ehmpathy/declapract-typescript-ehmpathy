# self-review: has-questioned-questions

triage each open question in the vision.

## questions triaged

### 1. should keyrack.source() be optional (graceful no-op if no keyrack.yml)?

**triage**: [answered]

**resolution**: yes, and the wish handoff already shows this pattern:
```typescript
if (existsSync(keyrackYmlPath)) {
  keyrack.source({ ... });
}
```

the template uses an existence check, so keyrack.source() is only called if keyrack.yml exists.

---

### 2. what's the fallback if daemon fails to start?

**triage**: [answered]

**resolution**: out of scope for declapract. this is a keyrack implementation concern. if the daemon fails, keyrack.source() should throw a helpful error. declapract templates don't need to handle this - keyrack does.

---

### 3. should we keep use.apikeys.sh as a legacy fallback in the transition?

**triage**: [answered]

**resolution**: no. the wish explicitly says "delete legacy files". clean break, no fallback. repos that haven't upgraded rhachet will get declapract violations until they do.

---

### 4. how to handle repos without rhachet installed? (dynamic import vs try/catch vs require rhachet)

**triage**: [research]

**why research needed**: the wish shows a static import at the top of the file:
```typescript
import { keyrack } from 'rhachet/keyrack';
```

but if rhachet isn't installed, this import fails before the existence check runs.

**options to research**:
1. **dynamic import**: `const { keyrack } = await import('rhachet/keyrack')` inside the if block
   - pros: graceful, only loads if needed
   - cons: requires async handle in jest env file
2. **try/catch around import**: wrap the import in try/catch
   - pros: simple
   - cons: hides other import errors
3. **require rhachet as prereq**: document that rhachet must be installed before declapract fix
   - pros: simplest implementation
   - cons: breaks repos without rhachet

**recommendation**: option 1 (dynamic import) is cleanest, but needs verification that jest env files can use async. research in blueprint phase.

---

## summary

| question | triage | action |
|----------|--------|--------|
| optional if no keyrack.yml | [answered] | existence check handles it |
| daemon fallback | [answered] | out of scope (keyrack's job) |
| legacy fallback | [answered] | no fallback per wish |
| repos without rhachet | [research] | verify dynamic import viability |

---

## issues found and fixed

### issue: questions were not triaged

**what I found**: the vision listed 4 open questions without triage status.

**how I fixed it**: updated each question in the vision with its triage:
- [answered] x3 - resolved via logic or wish content
- [research] x1 - needs verification in blueprint phase

**why this matters for next time**: always triage questions as [answered], [research], or [wisher] so the reader knows next steps.

---

## non-issues that hold

### question 1: optional keyrack.source()

**why it holds**: the wish handoff already shows the existence check pattern. no change needed.

### question 2: daemon fallback

**why it holds**: out of scope for declapract. keyrack is responsible for its own error messages.

### question 3: legacy fallback

**why it holds**: wish explicitly says "delete legacy files". no ambiguity.

---

## key learnings

1. **triage questions early** - don't leave them as vague "to validate"; mark each as answered, research, or wisher
2. **answer via extant content first** - many questions can be resolved by re-read of wish or code
3. **research flags defer work** - [research] means "answer this in blueprint phase", not "someone else's problem"
