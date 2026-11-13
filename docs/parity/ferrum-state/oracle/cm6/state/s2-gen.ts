// S2 generators, chunk `state`. Fixture ids F0900-F1299 (F0900-F1207 used). Run through s2-run.ts.
// Each generator is seeded with rng(seed) from @harness/lib (mulberry32); the seed is also recorded in every fixture input.
//
// G1 phrase interpolation (EditorState.phrase B3, B4, B7). seed 0x5701, 40 cases + 1 large.
//    empty template: case 0 ""; single element: one-token templates occur; many: up to 12 tokens; duplicates: tokens repeat
//    ("$1$1", "$$$$"); adjacent markers: tokens are concatenated without separators; boundaries: "$" at template end,
//    $0, $1..$3 around the argument count (0-3 args), $10/$99 beyond it; consumer values: callers pass English phrases
//    (commands.ts:559 "Selection deleted") with no markers; ASCII, BMP (é) and astral (😀) text and args; arguments
//    containing markers. Overlap, nesting, unsorted, CRLF/CR/U+2028 do not apply (no positions, no line structure).
//    Large case: 1200 tokens.
// G2 isUserEvent (Transaction.isUserEvent B1-B4). seed 0x5702, 40 cases + 1 large.
//    empty event and empty annotation; single segment; many segments (up to 4); equal pairs; prefix pairs (with and
//    without "."); consumer values (input.type, input.type.compose, select.pointer, delete.backward, input.complete);
//    BMP/astral segments. Positions, overlap, CRLF do not apply. Large case: 400-segment event.
// G3 toText / sliceDoc / create split (EditorState.toText B1, B2, B4; EditorState.sliceDoc B1-B4; EditorStateConfig.doc B1, B2).
//    seed 0x5703, 40 cases + 1 large. Empty string (case 0); single piece; many pieces; repeated breaks ("\n\n", "\r\n\r\n");
//    adjacent CR + LF pieces forming CRLF; boundaries: slices at 0, doc end, line ends, inside CRLF-free surrogate pairs,
//    out of range (-3, len + 3) and reversed; separators null, "\r\n", "\n", "|"; ASCII, é, 😀, CRLF, lone CR, U+2028.
//    Large case: 2000 pieces.
// G4 wordAt (EditorState.wordAt B1-B4, B7). seed 0x5704, 30 docs + 1 large; every position 0..length queried.
//    empty doc (case 0); one piece; many; repeated words; adjacent word/punctuation/space/emoji; positions at 0, line
//    ends, doc end, inside surrogate pairs; ASCII, é (precomposed and combining), 𝐀, 中, 😀, CRLF, "\n".
//    Large case: 600 pieces (positions sampled every 7th).
// G5 replaceSelection / changeByRange (EditorState.replaceSelection B1-B3, EditorState.changeByRange B2, B5).
//    seed 0x5705, 40 cases + 1 large. One range and many (up to 6); duplicate and overlapping ranges (normalized by
//    EditorSelection.create); adjacent ranges; cursors at 0 and at doc end; unsorted input with a random main index;
//    insert texts "", ASCII, é, 😀, "\n", "\r\n"; multiple selections enabled. Large case: 120 ranges on a 2000-char doc.
// G6 update with several specs (EditorState.update B4, TransactionSpec.changes B6, TransactionSpec.sequential B1,
//    TransactionSpec.selection B2-B4). seed 0x5706, 40 cases + 1 large. One to four specs; specs with no changes; same-
//    position insertions; overlapping deletions; sequential and non-sequential specs; selections at 0 and doc end and
//    out of range (errors captured); ASCII/é/😀/CRLF inserts. Large case: 40 specs.
// G7 change filter masks (EditorState^changeFilter B2, B3, B7). seed 0x5707, 30 cases + 1 large. One to three filters
//    each returning a sorted mask of 0-3 pairs; empty masks; masks covering the whole doc; adjacent and overlapping masks
//    across filters; insertions at mask boundaries; ASCII and astral docs. Large case: 50 filters on a 1000-char doc.
import {EditorState} from "@codemirror/state"
import {rng} from "@harness/lib"
import {run} from "./interp"
import {writer, $, op, R, set, rec, list, item, cond, block, fn, add, create, update, get, sliceDoc, cursor, range, jsel, jtext, chJSON, ann, T0, ofVar, of} from "./s2-lib"

const fx = writer(900)
const B = (item: string, n: number) => `state.${item}.B${n}`

// ---- G1 phrase
{
  const seed = 0x5701, r = rng(seed)
  const toks = ["$", "$$", "$1", "$2", "$3", "$0", "$01", "$10", "$99", "x", " ", "é", "\u{1F600}", "Selection deleted", "$1$1", "$$$$"]
  const argPool: any[] = ["A", "$1", "\u{1F601}", 7, "", "$$"]
  const s = EditorState.create()
  for (let i = 0; i <= 40; i++) {
    let n = i == 0 ? 0 : i == 40 ? 1200 : 1 + r.int(12)
    let tpl = Array.from({length: n}, () => r.pick(toks)).join("")
    let args = Array.from({length: i == 40 ? 3 : r.int(4)}, () => r.pick(argPool))
    let bs = [B("EditorState.phrase", args.length ? 3 : 4)]
    if (args.some(a => typeof a == "string" && a.includes("$"))) bs.push(B("EditorState.phrase", 7))
    fx("state.cm6.027", bs, R([], op("state.phrase", {state: create(), phrase: tpl, args}), {generator: "G1", seed, case: i}))
  }
}

// ---- G2 isUserEvent
{
  const seed = 0x5702, r = rng(seed)
  const segs = ["input", "type", "compose", "select", "pointer", "delete", "backward", "complete", "x", "", "é", "\u{1F600}"]
  const consumer = ["input.type", "input.type.compose", "select.pointer", "delete.backward", "input.complete", "input", "select", "delete"]
  const s = EditorState.create()
  const mk = (k: number) => Array.from({length: k}, () => r.pick(segs)).join(".")
  for (let i = 0; i <= 40; i++) {
    let a: string, ev: string
    if (i == 40) { a = Array.from({length: 400}, () => r.pick(segs)).join("."); ev = a.split(".").slice(0, 200).join(".") }
    else if (r.chance(0.3)) { a = r.pick(consumer); ev = r.pick(consumer) }
    else if (r.chance(0.4)) { a = mk(1 + r.int(4)); let parts = a.split("."); ev = parts.slice(0, r.int(parts.length + 1)).join(".") }
    else { a = mk(r.int(4)); ev = mk(r.int(3)) }
    if (i == 0) { a = ""; ev = "" }
    let n = !a ? 3 : ev == "" ? 4 : a == ev ? 1 : 2
    fx("state.cm6.104", [B("Transaction.isUserEvent", n)], R([], op("tr.isUserEvent", {tr: update(create(), {annotations: ann("Transaction.userEvent", a)}), event: ev}), {generator: "G2", seed, case: i}))
  }
}

// ---- G3 toText / sliceDoc
{
  const seed = 0x5703, r = rng(seed)
  const pieces = ["a", "bc", "é", "\u{1F600}", "\n", "\r\n", "\r", " ", " ", "\n\n", "|"]
  const seps: (string | null)[] = [null, "\r\n", "\n", "|"]
  for (let i = 0; i <= 40; i++) {
    let n = i == 0 ? 0 : i == 40 ? 2000 : 1 + r.int(10)
    let str = Array.from({length: n}, () => r.pick(pieces)).join("")
    let sep = r.pick(seps)
    let st = EditorState.create({doc: str, extensions: sep ? EditorState.lineSeparator.of(sep) : []})
    let len = st.doc.length
    let slices: any[] = []
    for (let k = 0; k < (i == 40 ? 20 : 4); k++) {
      let from = r.int(len + 7) - 3, to = r.int(len + 7) - 3
      slices.push([from, to])
    }
    let bs = [B("EditorState.toText", sep ? 2 : 1), B("EditorState.toText", 4), B("EditorStateConfig.doc", sep ? 2 : 1), B("EditorState.sliceDoc", sep == "\r\n" ? 2 : 1), B("EditorState.sliceDoc", 3)]
    if (str.includes("\u{1F600}")) bs.push(B("EditorState.sliceDoc", 4))
    fx("state.cm6.013", bs, R([set("s", create({doc: str, extensions: sep ? of("lineSeparator", sep) : []})), set("pairs", slices)],
       rec({toText: jtext(op("state.toText", {state: $("s"), string: str})), doc: jtext(get($("s"), "doc")),
            slices: op("map", {over: $("pairs"), as: "pr", do: rec({from: item($("pr"), 0), to: item($("pr"), 1), result: sliceDoc($("s"), item($("pr"), 0), item($("pr"), 1))})})}), {generator: "G3", seed, case: i}))
  }
}

// ---- G4 wordAt
{
  const seed = 0x5704, r = rng(seed)
  const pieces = ["ab", "é", "é", " ", "!", "\u{1F600}", "\u{1D400}", "中", "_", "\n", "\r\n", "9", "x-y"]
  for (let i = 0; i <= 30; i++) {
    let n = i == 0 ? 0 : i == 30 ? 600 : 1 + r.int(10)
    let doc = Array.from({length: n}, () => r.pick(pieces)).join("")
    let bs = [B("EditorState.wordAt", 1), B("EditorState.wordAt", 2)]
    if (/\n/.test(doc)) bs.push(B("EditorState.wordAt", 3))
    if (/[^\x00-\x7f]/.test(doc)) bs.push(B("EditorState.wordAt", 4))
    if (/\u{1F600}|\u{1D400}/u.test(doc)) bs.push(B("EditorState.wordAt", 7))
    const w = op("state.wordAt", {state: $("s"), pos: $("p")})
    fx("state.cm6.031", bs, R([set("s", create({doc}))], rec({docLength: get(get($("s"), "doc"), "length"),
       results: op("map", {over: op("ints", {from: 0, to: get(get($("s"), "doc"), "length"), step: i == 30 ? 7 : 1}), as: "p",
         do: block([set("w", w), set("res", cond($("w"), list($("p"), get($("w"), "from"), get($("w"), "to")), list($("p"), null)))], "res")})}), {generator: "G4", seed, case: i}))
  }
}

// ---- G5 replaceSelection / changeByRange
{
  const seed = 0x5705, r = rng(seed)
  const chars = ["a", "b", "é", "\u{1F600}", "\n", " "]
  const inserts = ["", "Q", "é", "\u{1F601}", "\n", "\r\n", "xy"]
  for (let i = 0; i <= 40; i++) {
    let docN = i == 40 ? 2000 : r.int(20)
    let doc = Array.from({length: docN}, () => r.pick(chars)).join("")
    let base = EditorState.create({doc})
    let len = base.doc.length
    let nr = i == 40 ? 120 : 1 + r.int(6)
    let raw = Array.from({length: nr}, () => { let a = r.int(len + 1), h = r.chance(0.5) ? a : r.int(len + 1); return [a, h] })
    let main = r.int(nr)
    let ins = r.pick(inserts)
    const mk = [set("raw", raw), set("s", create({doc, selection: op("sel.create", {ranges: op("map", {over: $("raw"), as: "pr", do: range(item($("pr"), 0), item($("pr"), 1))}), main}),
      extensions: of("allowMultipleSelections", true)}))]
    fx("state.cm6.010", [B("EditorState.replaceSelection", 1), B("EditorState.replaceSelection", 2), B("EditorState.replaceSelection", 3)],
       R([...mk, set("ns", get(update($("s"), op("state.replaceSelection", {state: $("s"), text: ins})), "state"))],
         rec({normalizedSelection: jsel(get($("s"), "selection")), doc: jtext(get($("ns"), "doc")), selection: jsel(get($("ns"), "selection"))}), {generator: "G5", seed, case: i}))
    const from = get($("rg"), "from"), back = op("max", {of: [0, op("sub", {a: from, b: 1})]})
    const f = fn(["rg"], cond(get($("rg"), "empty"), rec({changes: rec({from: back, to: from}), range: cursor(back)}),
      rec({changes: rec({from, to: get($("rg"), "to"), insert: ins}), range: range(from, add(from, get(op("state.toText", {state: $("s"), string: ins}), "length")))})))
    fx("state.cm6.011", [B("EditorState.changeByRange", 2), B("EditorState.changeByRange", 5)],
       R([...mk, set("cbr", op("state.changeByRange", {state: $("s"), f})), set("cs", get(update($("s"), $("cbr")), "state"))],
         rec({changes: chJSON(item($("cbr"), "changes")), doc: jtext(get($("cs"), "doc")), selection: jsel(get($("cs"), "selection"))}), {generator: "G5", seed, case: i}))
  }
}

// ---- G6 update with several specs
{
  const seed = 0x5706, r = rng(seed)
  const ins = ["", "A", "BB", "é", "\u{1F600}", "\r\n", "\n"]
  for (let i = 0; i <= 40; i++) {
    let doc = Array.from({length: r.int(12)}, () => r.pick(["a", "b", "c", "\n"])).join("")
    let st = EditorState.create({doc})
    let ns = i == 40 ? 40 : 1 + r.int(4)
    let specs: any[] = []
    let curLen = st.doc.length
    for (let k = 0; k < ns; k++) {
      let seq = k > 0 && r.chance(0.35)
      let refLen = seq ? curLen : st.doc.length
      let spec: any = {}
      let nc = r.int(3)
      if (nc) {
        spec.changes = Array.from({length: nc}, () => { let a = r.int(refLen + 1), b = Math.min(refLen, a + r.int(3)); return {from: a, to: b, insert: r.pick(ins)} })
      }
      if (seq) spec.sequential = true
      if (r.chance(0.4)) spec.selection = {anchor: r.int(refLen + 4)}
      specs.push(spec)
      try { curLen = st.update(...specs).changes.newLength } catch (_) {}
    }
    const input = R([set("t", update(create({doc}), ...specs, {annotations: T0}))], rec({changes: chJSON(get($("t"), "changes")), doc: jtext(get($("t"), "newDoc")), selection: jsel(get($("t"), "selection"))}), {generator: "G6", seed, case: i})
    let res: any = run(JSON.parse(JSON.stringify(input)))
    let bs = [B("EditorState.update", 4), B("TransactionSpec.changes", 6)]
    if (specs.some(s => s.sequential)) bs.push(B("TransactionSpec.sequential", 1))
    if (specs.some(s => s.selection)) bs.push(B("TransactionSpec.selection", 2), B("TransactionSpec.selection", 3))
    if ("error" in res) bs.push(/^Position/.test(res.error.message) ? B("TransactionSpec.selection", 4) : B("Transaction", 1))
    fx("state.cm6.009", bs, input)
  }
}

// ---- G7 change filter masks
{
  const seed = 0x5707, r = rng(seed)
  for (let i = 0; i <= 30; i++) {
    let docN = i == 30 ? 1000 : 1 + r.int(14)
    let doc = Array.from({length: docN}, () => r.pick(["a", "b", "\u{1F600}", "c"])).join("")
    let len = EditorState.create({doc}).doc.length
    let nf = i == 30 ? 50 : 1 + r.int(3)
    let masks: number[][] = []
    for (let f = 0; f < nf; f++) {
      let pts = Array.from({length: 2 * r.int(4)}, () => r.int(len + 1)).sort((x, y) => x - y)
      masks.push(pts)
    }
    let nc = i == 30 ? 60 : 1 + r.int(3)
    let changes = Array.from({length: nc}, () => { let a = r.int(len + 1), b = Math.min(len, a + r.int(4)); return {from: a, to: b, insert: r.pick(["", "X", "\u{1F601}"])} })
    fx("state.cm6.032", [B("EditorState^changeFilter", 2), B("EditorState^changeFilter", 3), B("EditorState^changeFilter", 7)],
       R([...masks.map((m, k) => set("m" + k, fn([], op("let", {value: m})))), set("t", update(create({doc, extensions: masks.map((_, k) => ofVar("changeFilter", "m" + k))}), {changes, annotations: T0}))],
         rec({changes: chJSON(get($("t"), "changes")), doc: jtext(get($("t"), "newDoc"))}), {generator: "G7", seed, case: i}))
  }
}
