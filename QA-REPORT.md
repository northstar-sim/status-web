# QA Report — WEB-3: WEB-2 service-card freshness edge cases

- **Tester:** Jordan Lee (QA)
- **Feature under test:** WEB-2 "Show deployment freshness on service card" (Maya Chen)
- **Tested commit:** `23f060fdc97319ebfb97b62df256d0debca7a72a` (branch `qa/WEB-3-freshness-edge-cases`)
- **Environment:** Node `node --test`, Linux; module `src/serviceCard.js` exercised directly
- **Existing suite:** `npm test` on the tested commit: 8/8 pass

## Bug: `deployedAt: null` renders "unknown" but emits a 1970 `datetime`

### Reproduction

```js
import { renderServiceCard } from './src/serviceCard.js';
renderServiceCard(
  { name: 'status-web', environment: 'staging', version: '1.4.2', deployedAt: null },
  new Date('2026-10-28T12:00:00Z'),
);
```

### Expected

The card shows `unknown`, and the machine-readable timestamp is empty, the same as for `undefined` / invalid strings:

```html
<time datetime="">unknown</time>
```

### Actual

```html
<time datetime="1970-01-01T00:00:00.000Z">unknown</time>
```

### Root cause (for the implementer; not fixed by QA)

`deploymentFreshness` treats `deployedAt == null` as unknown. But `renderServiceCard` computes `deployedIso` separately using only `Number.isNaN(new Date(deployedAt).getTime())`. `new Date(null)` is a valid Date at the Unix epoch, so it passes that check and gets serialized. The two code paths disagree about what "missing" means.

### Impact

- `null` is the normal way to say "missing" in JSON, so any service-status payload without a deployment time will hit this.
- The visible label is correct, but the `<time datetime>` attribute claims a deployment on 1970-01-01. Anything that reads the machine-readable value (browser tooltips/extensions, scrapers, monitoring or a11y tooling, future client-side refresh code) would see a 56-year-old deployment, not an unknown one.
- The card's own markup contradicts itself, and `null` behaves differently from `undefined`.
- Severity: low–medium. The human-visible text is correct and there is no security impact.

### Regression test

`test/serviceCard.edgeCases.test.js`. On the tested commit the `null` case **fails** (expected), and the `undefined` control case passes. Full suite: 9 pass / 1 fail.

## Other edge cases checked (no bug found)

| Area | Input | Result | Verdict |
|---|---|---|---|
| Missing deployedAt | `undefined`, `''`, `'not a date'`, `NaN`, `{}` | `unknown`, `datetime=""`, not stale | OK |
| Numeric epoch | `0` | `20754 days ago`, stale, datetime 1970 | Consistent (0 is a valid timestamp) |
| Future timestamp | `2027-01-01T00:00:00Z` | `in the future`, not stale | OK, matches implementation intent |
| Small clock skew | now + 5 s | `in the future` | Observation: a few seconds of skew between deployer and viewer shows "in the future" instead of "just now". Product decision, not filed as a bug |
| Date-only string | `2026-10-21` | parsed as UTC midnight, `7 days ago`, stale | OK |
| Stale boundary | exactly 7 days | stale | OK, covered by existing tests |
| HTML escaping | name `"><img src=x onerror=alert(1)>`, environment `<b>prod</b>'`, version `&amp;` | all escaped (`&quot;&gt;&lt;img…`, `&#39;`, `&amp;amp;`); datetime attribute escaped too | OK |
| Empty services | `renderStatusPage([])` | valid page with heading and no cards, no error | Observation: there is no "no services" empty-state message. Not specified in WEB-2 |
| Environment distinction | `staging` vs `production` | environment shown as escaped text only; markup is otherwise identical (no class or visual cue) | Observation: the only difference is the text label. Not specified as a requirement |
| Server default | no `DEPLOYED_AT` env | deployment time = process start | Documented in `src/server.js`. A restart makes the service look freshly deployed. Note for ops, not a bug |
