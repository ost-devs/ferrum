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
import {EditorState, EditorSelection, Transaction} from "@codemirror/state"
import {rng} from "@harness/lib"
import {writer, cap, sel, text, tr} from "./s2-lib"

const fx = writer(900)
const B = (item: string, n: number) => `state.${item}.B${n}`
const T0 = Transaction.time.of(1000)

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
    let res = s.phrase(tpl, ...args)
    let bs = [B("EditorState.phrase", args.length ? 3 : 4)]
    if (args.some(a => typeof a == "string" && a.includes("$"))) bs.push(B("EditorState.phrase", 7))
    fx("state.cm6.027", bs, {generator: "G1", seed, case: i, call: "EditorState.create().phrase(phrase, ...args)", phrase: tpl, args}, res)
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
    let ann: string, ev: string
    if (i == 40) { ann = Array.from({length: 400}, () => r.pick(segs)).join("."); ev = ann.split(".").slice(0, 200).join(".") }
    else if (r.chance(0.3)) { ann = r.pick(consumer); ev = r.pick(consumer) }
    else if (r.chance(0.4)) { ann = mk(1 + r.int(4)); let parts = ann.split("."); ev = parts.slice(0, r.int(parts.length + 1)).join(".") }
    else { ann = mk(r.int(4)); ev = mk(r.int(3)) }
    if (i == 0) { ann = ""; ev = "" }
    let res = s.update({annotations: Transaction.userEvent.of(ann)}).isUserEvent(ev)
    let n = !ann ? 3 : ev == "" ? 4 : ann == ev ? 1 : 2
    fx("state.cm6.104", [B("Transaction.isUserEvent", n)], {generator: "G2", seed, case: i, call: "s.update({annotations: Transaction.userEvent.of(ev)}).isUserEvent(event)", ev: ann, event: ev}, res)
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
      slices.push({from, to, result: st.sliceDoc(from, to)})
    }
    let bs = [B("EditorState.toText", sep ? 2 : 1), B("EditorState.toText", 4), B("EditorStateConfig.doc", sep ? 2 : 1), B("EditorState.sliceDoc", sep == "\r\n" ? 2 : 1), B("EditorState.sliceDoc", 3)]
    if (str.includes("\u{1F600}")) bs.push(B("EditorState.sliceDoc", 4))
    fx("state.cm6.013", bs, {generator: "G3", seed, case: i, call: "create({doc: string, extensions: lineSeparator.of(sep)}); toText(string); sliceDoc(from, to) for sampled pairs", string: str, sep},
       {toText: text(st.toText(str)), doc: text(st.doc), slices})
  }
}

// ---- G4 wordAt
{
  const seed = 0x5704, r = rng(seed)
  const pieces = ["ab", "é", "é", " ", "!", "\u{1F600}", "\u{1D400}", "中", "_", "\n", "\r\n", "9", "x-y"]
  for (let i = 0; i <= 30; i++) {
    let n = i == 0 ? 0 : i == 30 ? 600 : 1 + r.int(10)
    let doc = Array.from({length: n}, () => r.pick(pieces)).join("")
    let st = EditorState.create({doc})
    let results: any[] = []
    for (let pos = 0; pos <= st.doc.length; pos += (i == 30 ? 7 : 1)) {
      let w = st.wordAt(pos)
      results.push(w ? [pos, w.from, w.to] : [pos, null])
    }
    let bs = [B("EditorState.wordAt", 1), B("EditorState.wordAt", 2)]
    if (/\n/.test(doc)) bs.push(B("EditorState.wordAt", 3))
    if (/[^\x00-\x7f]/.test(doc)) bs.push(B("EditorState.wordAt", 4))
    if (/\u{1F600}|\u{1D400}/u.test(doc)) bs.push(B("EditorState.wordAt", 7))
    fx("state.cm6.031", bs, {generator: "G4", seed, case: i, call: "EditorState.create({doc}).wordAt(pos) for pos in 0..length (step 7 in the large case); [pos, from, to] or [pos, null]", doc},
       {docLength: st.doc.length, results})
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
    let selection = EditorSelection.create(raw.map(([a, h]) => EditorSelection.range(a, h)), main)
    let st = EditorState.create({doc, selection, extensions: EditorState.allowMultipleSelections.of(true)})
    let ins = r.pick(inserts)
    let ns = st.update(st.replaceSelection(ins)).state
    fx("state.cm6.010", [B("EditorState.replaceSelection", 1), B("EditorState.replaceSelection", 2), B("EditorState.replaceSelection", 3)],
       {generator: "G5", seed, case: i, call: "create({doc, selection: EditorSelection.create(ranges as [anchor, head], main), allowMultipleSelections}); update(replaceSelection(insert)).state", doc, ranges: raw, main, insert: ins},
       {normalizedSelection: sel(st.selection), doc: text(ns.doc), selection: sel(ns.selection)})
    let cbr = st.changeByRange(rg => rg.empty
      ? {changes: {from: Math.max(0, rg.from - 1), to: rg.from}, range: EditorSelection.cursor(Math.max(0, rg.from - 1))}
      : {changes: {from: rg.from, to: rg.to, insert: ins}, range: EditorSelection.range(rg.from, rg.from + st.toText(ins).length)})
    let cs = st.update(cbr).state
    fx("state.cm6.011", [B("EditorState.changeByRange", 2), B("EditorState.changeByRange", 5)],
       {generator: "G5", seed, case: i, call: "same state; changeByRange(r => r.empty ? delete the unit before (from-1..from), cursor at from-1 : replace by insert, range(from, from + insert length))", doc, ranges: raw, main, insert: ins},
       {changes: cbr.changes.toJSON(), doc: text(cs.doc), selection: sel(cs.selection)})
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
    let res = cap(() => { let t = st.update(...specs, {annotations: T0}); return {changes: t.changes.toJSON(), doc: text(t.newDoc), selection: sel(t.selection)} })
    let bs = [B("EditorState.update", 4), B("TransactionSpec.changes", 6)]
    if (specs.some(s => s.sequential)) bs.push(B("TransactionSpec.sequential", 1))
    if (specs.some(s => s.selection)) bs.push(B("TransactionSpec.selection", 2), B("TransactionSpec.selection", 3))
    if ("error" in res) bs.push(/^Position/.test(res.error.message) ? B("TransactionSpec.selection", 4) : B("Transaction", 1))
    fx("state.cm6.009", bs, {generator: "G6", seed, case: i, call: "s.update(...specs, {annotations: Transaction.time.of(1000)})", doc, specs}, res)
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
    let st = EditorState.create({doc, extensions: masks.map(m => EditorState.changeFilter.of(() => m))})
    let nc = i == 30 ? 60 : 1 + r.int(3)
    let changes = Array.from({length: nc}, () => { let a = r.int(len + 1), b = Math.min(len, a + r.int(4)); return {from: a, to: b, insert: r.pick(["", "X", "\u{1F601}"])} })
    let res = cap(() => { let t = st.update({changes, annotations: T0}); return {changes: t.changes.toJSON(), doc: text(t.newDoc)} })
    fx("state.cm6.032", [B("EditorState^changeFilter", 2), B("EditorState^changeFilter", 3), B("EditorState^changeFilter", 7)],
       {generator: "G7", seed, case: i, call: "create({doc, extensions: masks.map(m => changeFilter.of(() => m))}).update({changes})", doc, masks, changes}, res)
  }
}
