// Conformance step 5 (d) W1: the reference of state.cm6.189.d2 and state.cm6.190.d2, cm6 6.7.6 patched so that an
// ended span cursor's position compares greater than every bound, as the rows decide
// (docs/parity/ferrum-state/oracle/patches/state.cm6.189.d2.patch).
// Run: python3 tools/oracle_patch.py ferrum-state run state.cm6.189.d2 docs/parity/ferrum-state/written/patched.ts \
//   > docs/parity/ferrum-state/written/patched.out
import {RangeSet, RangeValue} from "@codemirror/state"

const out = (name: string, v: any) => console.log(name, "=>", JSON.stringify(v))
class M extends RangeValue { constructor(readonly name: string, readonly isPoint = false) { super(); this.point = isPoint } eq(o: M) { return this.name == o.name } }
const one = new M("one"), two = new M("two")
// 189.d2: two sets of one range [1, 5] (equal values), and two sets that differ after the first boundary
const a = RangeSet.of([one.range(1, 5)]), a2 = RangeSet.of([new M("one").range(1, 5)])
for (const to of [999999999, 1e9, 2e9, 2 ** 63, 2 ** 64]) out(`eq equal [1,5] to ${to}`, RangeSet.eq([a], [a2], 0, to))
const p = new M("p", true), q = new M("q", true), r = new M("r", true)
const x = RangeSet.of([p.range(1, 2), q.range(4, 6)]), y = RangeSet.of([p.range(1, 2), r.range(4, 6)])
for (const to of [999999999, 1e9, 2e9, 2 ** 64]) out(`eq differing to ${to}`, RangeSet.eq([x], [y], 0, to))
out("eq unequal values [1,5] to 2^64", RangeSet.eq([a], [RangeSet.of([two.range(1, 5)])], 0, 2 ** 64))
// 190.d2: one set of one range [1, 5], from 0
for (const [from, to] of [[0, 999999999], [0, 1e9], [0, 2e9], [0, 2 ** 64], [2 ** 63, 2 ** 64]]) {
  const sp: any[] = []
  const it = {span: (f: number, t: number, act: any[], o: number) => sp.push(["span", f, t, act.map(v => v.name), o]),
              point: (f: number, t: number, v: any, act: any[], o: number, i: number) => sp.push(["point", f, t, v.name, act.map(v => v.name), o, i])}
  const open = RangeSet.spans([a], from, to, it)
  out(`spans [1,5] ${from} ${to}`, {spans: sp, open})
}
