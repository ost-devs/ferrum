// S2 fixtures, chunk `state`: state creation, doc/selection/field/facet reads, toText, sliceDoc, JSON.
// Items state.cm6.001-008, 013-018. Fixture ids F0001-F0199. Run through s2-run.ts.
import {writer, $, op, R, set, rec, merge, list, same, label, push, fn, seq, add, mul, cond, item, count, capture, block,
        create, update, get, iget, field, facet, sliceDoc, cursor, range, selCreate, jsel, jtext, jst, jrange, of, prec, V} from "./s2-lib"

const fx = writer(1)
const I = {
  config: "state.cm6.001", cdoc: "state.cm6.002", csel: "state.cm6.003", cext: "state.cm6.004",
  state: "state.cm6.005", doc: "state.cm6.006", sel: "state.cm6.007", field: "state.cm6.008",
  toText: "state.cm6.013", slice: "state.cm6.014", facet: "state.cm6.015", toJSON: "state.cm6.016",
  fromJSON: "state.cm6.017", create: "state.cm6.018"
}
const B = (item: string, n: number) => `state.${item}.B${n}`
const s = $("s")
const lines = (st: any) => get(get(st, "doc"), "lines")
const docOf = (st: any) => get(st, "doc")
const selOf = (st: any) => get(st, "selection")
const fieldDef = (name: string, spec: any) => op("field.define", {name, spec})
const constFn = (v: any) => fn([], op("let", {value: v}))
const keep = fn(["v"], $("v"))
const toTextOf = (st: any, string: any) => op("state.toText", {state: st, string})

// ---- EditorStateConfig (001)
fx(I.config, [B("EditorStateConfig", 1), B("EditorStateConfig.doc", 5), B("EditorStateConfig.selection", 1), B("EditorStateConfig.extensions", 1)],
   R([set("s", create())], merge(jst(s), rec({docIsTextEmpty: same(docOf(s), op("text.empty")), tabSize: get(s, "tabSize"),
     lineSeparator: facet(s, "lineSeparator"), allowMultipleSelections: facet(s, "allowMultipleSelections"), readOnly: get(s, "readOnly")}))))
fx(I.config, [B("EditorStateConfig", 2), B("EditorState^fromJSON", 4)],
   R([set("s", op("state.fromJSON", {json: {doc: "xy", selection: {ranges: [{anchor: 1, head: 2}], main: 0}},
       config: {doc: "ignored", selection: {anchor: 0}, extensions: of("tabSize", 3)}}))], merge(jst(s), rec({tabSize: get(s, "tabSize")}))))

// ---- EditorStateConfig.doc (002)
for (let doc of ["ab\ncd", "a\r\nb\rc\nd", "a\n", "\r\n\r\n", "x\u2028y", "\u{1F600}\nb", "\r"])
  fx(I.cdoc, [B("EditorStateConfig.doc", 1)], R([set("s", create({doc}))], rec({doc: jtext(docOf(s)), lines: lines(s)})))
for (let [doc, sep] of [["a\nb\r\nc", "\r\n"], ["a\r\nb", "\n"], ["a|b\nc", "|"], ["x\u2028y\nz", "\u2028"], ["\u{1F600}\r\n\u{1F601}", "\r\n"]] as const)
  fx(I.cdoc, [B("EditorStateConfig.doc", 2)], R([set("s", create({doc, extensions: of("lineSeparator", sep)}))],
     rec({doc: jtext(docOf(s)), lines: lines(s), sliceDoc: sliceDoc(s)})))
fx(I.cdoc, [B("EditorStateConfig.doc", 3)], R([set("s", create({doc: "a\r\nb\nc", extensions: of("lineSeparator", "")}))],
   rec({doc: jtext(docOf(s)), lineBreak: get(s, "lineBreak"), sliceDoc: sliceDoc(s)})))
fx(I.cdoc, [B("EditorStateConfig.doc", 4)], R([set("t", op("text.of", {lines: ["a", "b|c"]})), set("s", create({doc: $("t"), extensions: of("lineSeparator", "|")}))],
   rec({sameObject: same(docOf(s), $("t")), doc: jtext(docOf(s)), sliceDoc: sliceDoc(s)})))
for (let doc of [undefined, "", null])
  fx(I.cdoc, [B("EditorStateConfig.doc", 5)], R([set("s", create({doc}))],
     rec({doc: jtext(docOf(s)), lines: lines(s), isTextEmpty: same(docOf(s), op("text.empty"))})))

// ---- EditorStateConfig.selection (003)
for (let selection of [undefined, null, 0])
  fx(I.csel, [B("EditorStateConfig.selection", 1)], R([set("s", create({doc: "abc", selection}))], rec({selection: jsel(selOf(s))})))
fx(I.csel, [B("EditorStateConfig.selection", 2)], R([set("given", selCreate([cursor(2, 1, 1, 5)])), set("s", create({doc: "abc", selection: $("given")}))],
   rec({sameObject: same(selOf(s), $("given")), selection: jsel(selOf(s))})))
fx(I.csel, [B("EditorStateConfig.selection", 2), B("EditorStateConfig.selection", 7)],
   R([set("given", selCreate([range(0, 1), range(2, 3)], 1)), set("s", create({doc: "abc", selection: $("given"), extensions: of("allowMultipleSelections", true)}))],
     rec({sameObject: same(selOf(s), $("given")), selection: jsel(selOf(s))})))
for (let selection of [{anchor: 2}, {anchor: 1, head: 3}, {anchor: 3, head: 1}, {anchor: 2, head: 2}, {anchor: 3}])
  fx(I.csel, [B("EditorStateConfig.selection", 3)], R([set("s", create({doc: "abc", selection}))], rec({selection: jsel(selOf(s))})))
for (let selection of [{anchor: 4}, {anchor: 0, head: 4}, {anchor: 1e8}])
  fx(I.csel, [B("EditorStateConfig.selection", 4)], R([], jsel(selOf(create({doc: "abc", selection})))))
fx(I.csel, [B("EditorStateConfig.selection", 5), B("EditorState^create", 1)],
   R([set("multi", selCreate([cursor(1), cursor(9)], 0))], jsel(selOf(create({doc: "abc", selection: $("multi")})))))
for (let selection of [{anchor: -1}, {anchor: 1.5, head: 0}, {anchor: -3, head: 2}])
  fx(I.csel, [B("EditorStateConfig.selection", 6)], R([], jsel(selOf(create({doc: "abc", selection})))))
{
  const ranges = [set("r0", cursor(0)), set("r1", range(1, 2)), set("r2", cursor(3))]
  const rs = op("list", {of: [$("r0"), $("r1"), $("r2")]})
  fx(I.csel, [B("EditorStateConfig.selection", 7)], R([...ranges, set("one", create({doc: "abc", selection: op("sel.create", {ranges: rs, main: 1})}))],
     rec({selection: jsel(selOf($("one"))), mainRangeKept: same(item(get(selOf($("one")), "ranges"), 0), $("r1"))})))
  fx(I.csel, [B("EditorStateConfig.selection", 7)], R([...ranges, set("many", create({doc: "abc", selection: op("sel.create", {ranges: rs, main: 1}), extensions: of("allowMultipleSelections", true)}))],
     rec({selection: jsel(selOf($("many")))})))
}
for (let [doc, selection] of [["\u{1F600}", {anchor: 1}], ["\u{1F600}x", {anchor: 3, head: 0}], ["a\r\nb", {anchor: 3}], ["a\r\nb", {anchor: 4}]] as const)
  fx(I.csel, [B("EditorStateConfig.selection", 8)], R([], rec({docLength: get(docOf(create({doc})), "length"), selection: jsel(selOf(create({doc, selection})))})))

// ---- EditorStateConfig.extensions (004)
for (let extensions of [{raw: "undefined"}, {raw: "null"}, []])
  fx(I.cext, [B("EditorStateConfig.extensions", 1)], R([set("s", create({doc: "a", extensions}))],
     rec({tabSize: get(s, "tabSize"), readOnly: get(s, "readOnly"), lineSeparator: facet(s, "lineSeparator"), phrases: facet(s, "phrases")})))
{
  const defs = [op("define", {def: ["compartment", "comp"]}), op("facet.define", {name: "f"})]
  fx(I.cext, [B("EditorStateConfig.extensions", 2)], R(defs, get(docOf(create({extensions: [{comp: ["comp", of("f", 1)]}, {comp: ["comp", of("f", 2)]}]})), "length")))
  fx(I.cext, [B("EditorStateConfig.extensions", 2)], R(defs, get(docOf(create({extensions: [{raw: "plainObject"}]})), "length")))
  fx(I.cext, [B("EditorStateConfig.extensions", 2)], R(defs, get(docOf(create({extensions: [{raw: "selfExtension"}]})), "length")))
}
fx(I.cext, [B("EditorStateConfig.extensions", 3), B("EditorState^fromJSON", 3)],
   R([fieldDef("field", {create: constFn(0), update: keep, toJSON: keep, fromJSON: fn(["j"], mul($("j"), 10))}),
      set("s", op("state.fromJSON", {json: {doc: "", selection: {ranges: [{anchor: 0, head: 0}], main: 0}, f: 4},
        config: {extensions: [{init: ["field", {const: 99}]}]}, fields: {f: "field"}}))],
     rec({field: field(s, "field")})))

// ---- EditorState (005)
fx(I.state, [B("EditorState", 1)],
   R([set("calls", list()),
      fieldDef("A", {create: fn([], seq(push($("calls"), label("A.create")), 1)), update: fn(["v"], seq(push($("calls"), label("A.update")), $("v")))}),
      op("facet.define", {name: "f"}),
      set("g", fn(["gs"], seq(push($("calls"), label("f.get")), add(field($("gs"), "A"), 1)))),
      set("s", create({extensions: [{field: "A"}, {compute: ["f", [{field: "A"}], {callVar: "g"}]}]})),
      set("afterCreate", op("copy", {of: $("calls")})),
      field(s, "A"), facet(s, "f"), field(s, "A")],
     rec({callsDuringCreate: $("afterCreate"), callsAfterReads: $("calls"), facet: facet(s, "f")})))
fx(I.state, [B("EditorState", 2), B("EditorState.field", 5)],
   R([fieldDef("A", {create: fn(["cs"], add(field($("cs"), "B"), 1)), update: keep}), fieldDef("B", {create: constFn(10), update: keep}),
      set("s", create({extensions: [{field: "A"}, {field: "B"}]}))], rec({A: field(s, "A"), B: field(s, "B")})))
fx(I.state, [B("EditorState", 3)],
   R([fieldDef("D", {create: fn(["cs"], field($("cs"), "C")), update: keep}), fieldDef("C", {create: fn(["cs"], field($("cs"), "D")), update: keep})],
     field(create({extensions: [{field: "D"}, {field: "C"}]}), "D")))
fx(I.state, [B("EditorState", 3)],
   R([fieldDef("E1", {create: constFn(0), update: fn(["v", "t"], field(get($("t"), "state"), "E2"))}),
      fieldDef("E2", {create: constFn(0), update: fn(["v", "t"], field(get($("t"), "state"), "E1"))}),
      set("s", create({extensions: [{field: "E1"}, {field: "E2"}]}))],
     field(get(update(s, {}), "state"), "E1")))
fx(I.state, [B("EditorState", 4)],
   R([fieldDef("f", {create: constFn(0), update: fn(["v"], add($("v"), 1))}),
      set("s", create({doc: "abc", selection: {anchor: 1}, extensions: {field: "f"}})),
      set("d0", docOf(s)), set("s0", selOf(s)), field(s, "f"),
      set("ns", get(update(s, {changes: {from: 0, to: 3, insert: "xyz!"}, selection: {anchor: 4}}), "state"))],
     rec({startAfter: merge(jst(s), rec({field: field(s, "f")})), startDocSame: same(docOf(s), $("d0")), startSelectionSame: same(selOf(s), $("s0")),
          newState: merge(jst($("ns")), rec({field: field($("ns"), "f")}))})))
fx(I.state, [B("EditorState", 5), B("Transaction.state", 8)],
   R([set("seen", list()),
      fieldDef("A", {create: constFn(0), update: fn(["v"], add($("v"), 1))}),
      fieldDef("B", {create: constFn(0), update: fn(["v", "t"], block([
        push($("seen"), cond(op("isType", {of: get($("t"), "state"), type: "undefined"}), label("?"), label("state"))),
        set("x", mul(field(get($("t"), "state"), "A"), 10)), push($("seen"), $("x"))], "x"))}),
      set("s", create({extensions: [{field: "B"}, {field: "A"}]})), set("ns", get(update(s, {}), "state"))],
     rec({B: field($("ns"), "B"), A: field($("ns"), "A"), seenInsideUpdate: $("seen")})))
fx(I.state, [B("EditorState", 5), B("Transaction.state", 8)],
   R([fieldDef("C", {create: constFn(0), update: fn(["v", "t"], block([set("captured", get($("t"), "state"))], "v"))}),
      set("t2", update(create({extensions: {field: "C"}}), {}))],
     rec({trStateInsideUpdateIsFinalState: same(get($("t2"), "state"), $("captured"))})))

// ---- EditorState.doc (006)
{
  const s0 = set("s", create({doc: "abc"}))
  fx(I.doc, [B("EditorState.doc", 1)], R([s0, set("t", update(s, {changes: {from: 1, insert: "X"}}))],
     rec({doc: jtext(docOf(get($("t"), "state"))), sameAsNewDoc: same(docOf(get($("t"), "state")), get($("t"), "newDoc"))})))
  fx(I.doc, [B("EditorState.doc", 2)], R([s0], rec({sameAsStartDoc: same(docOf(get(update(s, {selection: {anchor: 2}}), "state")), docOf(s))})))
  fx(I.doc, [B("EditorState.doc", 2)], R([s0, set("t", update(s, {changes: {from: 1, insert: ""}}))],
     rec({sameAsStartDoc: same(docOf(get($("t"), "state")), docOf(s)), docChanged: get($("t"), "docChanged")})))
  fx(I.doc, [B("EditorState.doc", 3), B("EditorState^lineSeparator", 3)],
     R([set("crlf", create({doc: "a\r\nb"})), set("re", get(update($("crlf"), {effects: op("effect.reconfigure", {ext: of("lineSeparator", "\r\n")})}), "state"))],
       rec({sameDoc: same(docOf($("re")), docOf($("crlf"))), doc: jtext(docOf($("re"))), sliceDoc: sliceDoc($("re")), lineBreak: get($("re"), "lineBreak")})))
}

// ---- EditorState.selection (007)
{
  const s0 = set("s", create({doc: "abc", selection: {anchor: 1}}))
  fx(I.sel, [B("EditorState.selection", 1)], R([s0], rec({same: same(selOf(get(update(s, {}), "state")), selOf(s))})))
  fx(I.sel, [B("EditorState.selection", 1)], R([s0], rec({same: same(selOf(get(update(s, {changes: {from: 2, insert: ""}}), "state")), selOf(s))})))
  let cases: [string, any, any][] = [
    ["abcd", cursor(2, 1), {from: 2, insert: "X"}],
    ["abcd", cursor(2, -1), {from: 2, insert: "X"}],
    ["abcd", cursor(2), {from: 2, insert: "X"}],
    ["abcd", range(1, 3), [{from: 1, insert: "X"}, {from: 3, insert: "Y"}]],
    ["abcd", range(3, 1), [{from: 1, insert: "X"}, {from: 3, insert: "Y"}]],
    ["abcd", range(1, 3), {from: 0, to: 4}],
    ["abcd", op("sel.cursor", {pos: 3, assoc: 0, bidiLevel: undefined, goalColumn: 7}), {from: 0, insert: "Z"}],
    ["a\u{1F600}b", cursor(3), {from: 1, to: 3, insert: "\u{1F601}\u{1F602}"}],
    ["a\r\nb", cursor(2), {from: 1, insert: "\r\n"}],
  ]
  for (let [doc, r, changes] of cases)
    fx(I.sel, [B("EditorState.selection", 2)], R([set("ns", get(update(create({doc, selection: selCreate([r])}), {changes}), "state"))],
       rec({selection: jsel(selOf($("ns"))), doc: jtext(docOf($("ns")))})))
  const two = set("two", selCreate([cursor(0), cursor(2)], 1))
  fx(I.sel, [B("EditorState.selection", 3), B("EditorState^allowMultipleSelections", 3)],
     R([two, set("t", update(create({doc: "abc"}), {selection: $("two"), effects: op("effect.appendConfig", {ext: of("allowMultipleSelections", true)})}))],
       rec({trSelection: jsel(get($("t"), "selection")), stateSelection: jsel(selOf(get($("t"), "state"))), newStateAllows: facet(get($("t"), "state"), "allowMultipleSelections")})))
  fx(I.sel, [B("EditorState.selection", 3), B("EditorState^allowMultipleSelections", 3)],
     R([two, set("t2", update(create({doc: "abc", extensions: of("allowMultipleSelections", true)}), {selection: $("two"), effects: op("effect.reconfigure", {ext: []})})),
        set("t3", update(get($("t2"), "state"), {selection: $("two")}))],
       rec({stateSelection: jsel(selOf(get($("t2"), "state"))), newStateAllows: facet(get($("t2"), "state"), "allowMultipleSelections"), nextStateSelection: jsel(selOf(get($("t3"), "state")))})))
  fx(I.sel, [B("EditorState.selection", 4)],
     R([s0, set("explicit", selCreate([cursor(1, 1, 0, 4)])), set("t4", update(s, {changes: {from: 0, insert: "Q"}, selection: $("explicit")}))],
       rec({same: same(selOf(get($("t4"), "state")), $("explicit")), selection: jsel(selOf(get($("t4"), "state")))})))
}

// ---- EditorState.field (008)
{
  const defs = [fieldDef("F", {create: constFn("v"), update: keep}), fieldDef("G", {create: constFn("g"), update: keep}), set("s", create({extensions: {field: "F"}}))]
  fx(I.field, [B("EditorState.field", 1)], R(defs, field(s, "F")))
  fx(I.field, [B("EditorState.field", 2)], R(defs, field(s, "G")))
  fx(I.field, [B("EditorState.field", 2)], R(defs, field(s, "G", undefined)))
  fx(I.field, [B("EditorState.field", 3)], R(defs, field(s, "G", false)))
  fx(I.field, [B("EditorState.field", 3)], R(defs, field(s, "G", 0)))
  fx(I.field, [B("EditorState.field", 4)], R(defs, field(s, "F", false)))
}

// ---- toText (013)
for (let str of ["a\nb", "a\r\nb\rc\nd", "x\u2028y", "\u{1F600}\r\n\u00e9", "a\n", "\n\n"])
  fx(I.toText, [B("EditorState.toText", 1), B("EditorState.toText", 4)], R([], jtext(toTextOf(create(), str))))
for (let [str, sep] of [["a\nb", "\r\n"], ["a\r\nb\r\n", "\r\n"], ["a\rb\nc", "\r"], ["\u{1F600}|x", "|"]] as const)
  fx(I.toText, [B("EditorState.toText", 2), B("EditorState.toText", 4)], R([], jtext(toTextOf(create({extensions: of("lineSeparator", sep)}), str))))
fx(I.toText, [B("EditorState.toText", 3)], R([set("t", toTextOf(create(), ""))], merge(jtext($("t")), rec({isTextEmpty: same($("t"), op("text.empty"))}))))
fx(I.toText, [B("EditorState.toText", 3)], R([], jtext(toTextOf(create({extensions: of("lineSeparator", "")}), "a\r\nb"))))

// ---- sliceDoc (014)
{
  const s1 = set("s", create({doc: "ab\ncd\n\nef"}))
  for (let args of [[], [1], [1, 4], [2, 3], [3, 3], [0, 9]] as number[][])
    fx(I.slice, [B("EditorState.sliceDoc", 1)], R([s1], sliceDoc(s, ...args)))
  for (let args of [[], [1, 4], [2, 3], [3, 7]] as number[][])
    fx(I.slice, [B("EditorState.sliceDoc", 2)], R([set("s", create({doc: "ab\r\ncd\r\n", extensions: of("lineSeparator", "\r\n")}))], sliceDoc(s, ...args)))
  fx(I.slice, [B("EditorState.sliceDoc", 1)], R([set("s", create({doc: "a\r\nb"}))], sliceDoc(s)))
  for (let args of [[-5, 2], [2, 100], [5, 3], [100, 200], [-3, -1]] as number[][])
    fx(I.slice, [B("EditorState.sliceDoc", 3)], R([s1], sliceDoc(s, ...args)))
  for (let args of [[0, 2], [2, 4], [1, 3], [0, 4]] as number[][])
    fx(I.slice, [B("EditorState.sliceDoc", 4)], R([set("s", create({doc: "a\u{1F600}b"}))], rec({result: sliceDoc(s, ...args)})))
}

// ---- facet (015)
{
  // G's combine is v => v.reduce((a, b) => a + b, 100): the sum of the values plus 100
  const G = [op("facet.define", {name: "F"}),
    set("gc", fn(["vs"], op("sumOf", {of: $("vs"), init: 100}))),
    op("facet.define", {name: "G", spec: {combine: $("gc")}})]
  fx(I.facet, [B("EditorState.facet", 1)], R([...G, set("s1", create()), set("s2", create({doc: "x"}))],
     rec({F: facet($("s1"), "F"), G: facet($("s1"), "G"), defaultSameObjectAcrossStates: same(facet($("s1"), "F"), facet($("s2"), "F"))})))
  const s3 = set("s3", create({extensions: [of("F", 1), of("F", 2), prec("high", of("F", 3)), of("G", 5)]}))
  fx(I.facet, [B("EditorState.facet", 2)], R([...G, s3, set("s4", get(update($("s3"), {changes: {from: 0, insert: "z"}}), "state"))],
     rec({F: facet($("s3"), "F"), G: facet($("s3"), "G"), FSameObjectAfterUpdate: same(facet($("s3"), "F"), facet($("s4"), "F"))})))
  fx(I.facet, [B("EditorState.facet", 3)],
     R([...G, fieldDef("field", {create: constFn(1), update: fn(["v", "t"], cond(get($("t"), "docChanged"), add($("v"), 1), $("v")))}),
        set("s5", create({extensions: [{field: "field"}, {from: ["F", "field"]}, of("F", 7)]})),
        set("s6", get(update($("s5"), {}), "state")), set("s7", get(update($("s5"), {changes: {from: 0, insert: "a"}}), "state"))],
       rec({initial: facet($("s5"), "F"), afterEmpty: facet($("s6"), "F"), sameObjectAfterEmpty: same(facet($("s6"), "F"), facet($("s5"), "F")), afterChange: facet($("s7"), "F")})))
  fx(I.facet, [B("EditorState.facet", 4)], R([...G, s3, set("rd", op("facet.reader", {facet: "F"}))],
     rec({same: same(facet($("s3"), $("rd")), facet($("s3"), "F")), value: facet($("s3"), $("rd"))})))
}

// ---- toJSON (016)
{
  fx(I.toJSON, [B("EditorState.toJSON", 1)], R([set("s", create({doc: "ab\ncd", selection: selCreate([cursor(1, 1, 0, 3), range(4, 2)], 1), extensions: of("allowMultipleSelections", true)}))],
     op("state.toJSON", {state: s})))
  fx(I.toJSON, [B("EditorState.toJSON", 1)], R([set("s", create({doc: "a\r\nb", extensions: of("lineSeparator", "\r\n"), selection: {anchor: 3}}))], op("state.toJSON", {state: s})))
  fx(I.toJSON, [B("EditorState.toJSON", 1)], R([set("s", create({doc: "\u{1F600}", selection: {anchor: 2}}))], op("state.toJSON", {state: s})))
  const defs = [
    fieldDef("f1", {create: constFn(3), update: keep, toJSON: fn(["v", "st"], rec({n: $("v"), len: get(get($("st"), "doc"), "length")}))}),
    fieldDef("f2", {create: constFn(4), update: keep, toJSON: fn(["v"], list($("v")))}),
    fieldDef("absent", {create: constFn(5), update: keep, toJSON: keep}),
    set("s", create({doc: "xyz", extensions: [{field: "f1"}, {field: "f2"}]}))]
  fx(I.toJSON, [B("EditorState.toJSON", 2), B("EditorState.toJSON", 3)], R(defs, op("state.toJSON", {state: s, fields: {z: "f2", a: "f1", missing: "absent", notAField: 42}})))
  fx(I.toJSON, [B("EditorState.toJSON", 4)], R([fieldDef("noJSON", {create: constFn(1), update: keep}), set("s", create({extensions: {field: "noJSON"}}))],
     op("state.toJSON", {state: s, fields: {f: "noJSON"}})))
  fx(I.toJSON, [B("EditorState.toJSON", 5)], R(defs, op("state.toJSON", {state: s, fields: {doc: "f1", selection: "f2"}})))
}

// ---- fromJSON (017)
{
  for (let json of [null, undefined, {}, {doc: 5}, {doc: ["a"]}, "abc"])
    fx(I.fromJSON, [B("EditorState^fromJSON", 1)], R([], jst(op("state.fromJSON", {json}))))
  for (let json of [{doc: "ab"}, {doc: "ab", selection: {ranges: [], main: 0}}, {doc: "ab", selection: {ranges: [{anchor: 0, head: 0}], main: 1}},
                    {doc: "ab", selection: {ranges: [{anchor: 0}], main: 0}}, {doc: "ab", selection: {ranges: [{anchor: "0", head: 0}], main: 0}}])
    fx(I.fromJSON, [B("EditorState^fromJSON", 2)], R([], jst(op("state.fromJSON", {json}))))
  const fdef = fieldDef("field", {create: fn([], op("record", {of: {n: 0}})), update: keep, toJSON: fn(["v"], item($("v"), "n")),
    fromJSON: fn(["j", "st"], rec({n: add($("j"), get(get($("st"), "doc"), "length"))}))})
  let ok = {doc: "abc", selection: {ranges: [{anchor: 1, head: 1}], main: 0}}
  fx(I.fromJSON, [B("EditorState^fromJSON", 3)], R([fdef], field(op("state.fromJSON", {json: {...ok, f: 7}, config: {}, fields: {f: "field"}}), "field")))
  fx(I.fromJSON, [B("EditorState^fromJSON", 3)], R([fdef], field(op("state.fromJSON", {json: ok, config: {}, fields: {f: "field"}}), "field", false)))
  fx(I.fromJSON, [B("EditorState^fromJSON", 3)], R([fdef], field(op("state.fromJSON", {json: ok, config: {extensions: {field: "field"}}, fields: {f: "field"}}), "field")))
  let j2 = {doc: "a\r\nb\nc", selection: {ranges: [{anchor: 5, head: 5}], main: 0}}
  fx(I.fromJSON, [B("EditorState^fromJSON", 4)], R([set("s", op("state.fromJSON", {json: j2, config: {extensions: of("lineSeparator", "\r\n")}}))],
     merge(jst(s), rec({toJSON: op("state.toJSON", {state: s})}))))
  fx(I.fromJSON, [B("EditorState^fromJSON", 4)], R([set("s", op("state.fromJSON", {json: j2}))], merge(jst(s), rec({toJSON: op("state.toJSON", {state: s})}))))
  let j3 = {doc: "abcdef", selection: {ranges: [{anchor: 5, head: 4}, {anchor: 0, head: 3}, {anchor: 2, head: 2}], main: 1}}
  fx(I.fromJSON, [B("EditorState^fromJSON", 5)], R([], jsel(selOf(op("state.fromJSON", {json: j3, config: {extensions: of("allowMultipleSelections", true)}})))))
  fx(I.fromJSON, [B("EditorState^fromJSON", 5)], R([], jsel(selOf(op("state.fromJSON", {json: j3})))))
  fx(I.fromJSON, [B("EditorState^fromJSON", 6)], R([], jst(op("state.fromJSON", {json: {doc: "ab", selection: {ranges: [{anchor: 0, head: 3}], main: 0}}}))))
  fx(I.fromJSON, [B("EditorState^fromJSON", 7)],
     R([set("orig", create({doc: "x\u{1F600}y\nz", selection: selCreate([cursor(3, 1, 0, 2)])})),
        set("back", op("state.fromJSON", {json: op("jsonCopy", {of: op("state.toJSON", {state: $("orig")})})}))],
       rec({original: jst($("orig")), restored: jst($("back"))})))
}

// ---- create (018)
{
  fx(I.create, [B("EditorState^create", 1)], R([op("define", {def: ["compartment", "comp"]}), op("facet.define", {name: "f"})],
     create({doc: "ab", selection: {anchor: 5}, extensions: [{comp: ["comp", of("f", 1)]}, {comp: ["comp", of("f", 2)]}]})))
  fx(I.create, [B("EditorState^create", 2)],
     R([set("seen", null),
        fieldDef("field", {create: fn(["cs"], block([set("seen", rec({docLength: get(get($("cs"), "doc"), "length"),
          ranges: count(get(get($("cs"), "selection"), "ranges")), main: get(get(get($("cs"), "selection"), "main"), "head")}))], "seen")), update: keep}),
        create({doc: "abcd", selection: selCreate([cursor(1), cursor(3)], 1), extensions: {field: "field"}})],
       rec({seenByCreate: $("seen")})))
}

// ---- test-state#17 scenario (EditorStateConfig.selection B7, EditorState.selection B3)
fx(I.csel, [B("EditorStateConfig.selection", 7), B("EditorState.selection", 3)],
   R([set("cursors", selCreate([cursor(0), cursor(1)])), set("s", create({selection: $("cursors"), doc: "123"}))],
     rec({cursors: jsel($("cursors")), created: jsel(selOf(s)), updated: jsel(selOf(get(update(s, {selection: $("cursors")}), "state")))})))
