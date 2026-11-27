// state.cm6.181.d1: 20,000 nested ranges [i, 2n - i] built, updated, mapped and sized, on a stack large enough.
// Run: ulimit -s unlimited; TSX_TSCONFIG_PATH=$PWD/.harness/state/tsconfig.json node --stack-size=900000 \
//   --import <tsx>/dist/loader.mjs docs/parity/ferrum-state/written/layers.ts \
//   > docs/parity/ferrum-state/written/layers.out
import {ChangeSet, RangeSet, RangeValue} from "@codemirror/state"
class M extends RangeValue { constructor(readonly name: string) { super() } eq(o: M) { return this.name == o.name } }
const v = new M("v"), n = 20000
const sum = (s: RangeSet<M>) => { let k = 0, f = 0, t = 0, first: any = null, last: any = null
  for (let c = s.iter(); c.value; c.next()) { k++; f += c.from; t += c.to; if (!first) first = [c.from, c.to]; last = [c.from, c.to] }
  return {size: s.size, iterated: k, sumFrom: f, sumTo: t, first, last} }
const ranges = []; for (let i = 0; i < n; i++) ranges.push(v.range(i, 2 * n - i))
const set = RangeSet.of(ranges)
console.log("built", JSON.stringify(sum(set)))
const updated = set.update({filter: (from) => from % 2 == 0, add: [v.range(n, n + 1)], sort: true})
console.log("updated", JSON.stringify(sum(updated)))
const mapped = set.map(ChangeSet.of([{from: 0, insert: "x"}, {from: n, to: n + 10}], 2 * n))
console.log("mapped", JSON.stringify(sum(mapped)))
