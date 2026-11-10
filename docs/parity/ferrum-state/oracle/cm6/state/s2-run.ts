// Regenerates docs/parity/ferrum-state/fixtures/state.jsonl for chunk `state` (S2).
// Run from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/state/s2-run.ts
// Each probe owns an id range (writer(base) in s2-lib.ts), so ids stay stable when one probe grows:
//   s2-create.ts F0001-F0199, s2-facets.ts F0200-F0399, s2-update.ts F0400-F0699,
//   s2-filters.ts F0700-F0799, s2-effects.ts F0800-F0899, s2-gen.ts F0900-F1299, s2-d1d2.ts F1300-F1399.
// Side-effect imports run in order.
import "./s2-reset"
import "./s2-create"
import "./s2-facets"
import "./s2-update"
import "./s2-filters"
import "./s2-effects"
import "./s2-gen"
import "./s2-d1d2"
