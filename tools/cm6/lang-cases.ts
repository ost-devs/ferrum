// Cases of the language of tools/cm6/program.ts that touch no cm6 value: the reference for a crate's fixture replayer,
// whose evaluator must give these outputs before any op of a chunk exists.
//   npx tsx --tsconfig .harness/<package>/tsconfig.json tools/cm6/lang-cases.ts            writes tools/cm6/lang-cases.jsonl
//   npx tsx --tsconfig .harness/<package>/tsconfig.json tools/cm6/lang-cases.ts --check    fails when that file is not what this run gives
// (any built harness maps "@harness/program"; tools/spec_check.py runs the second form). One line per case:
// {id, input, output}, the input a program or a bare expression, the output what `new Language("lang", ["note"])`
// returns for it, both written through `encode` (tools/cm6/oracle-lib.ts). No expected value is written here: every
// output is the run's. The input and the output count UTF-16 code units, as the language does.
//
// The cases are written by hand, one group per op of the language, on the values the ops meet in fixtures: numbers
// (integers, halves, -0, NaN, the infinities), strings (ASCII, astral, a lone surrogate), null, undefined, arrays and
// objects the program builds and shares. An op added to program.ts gets its cases here in the same change:
// tools/spec_check.py fails on an op of the language that no case runs.
import {readFileSync, writeFileSync, existsSync} from "node:fs"
import {fileURLToPath} from "node:url"
import {encode} from "@harness/lib"
import {Language} from "@harness/program"

const lang = new Language("lang", ["note"])
const $ = (name: string) => ({$: name})
const op = (name: string, args: object = {}) => ({op: name, ...args})
const und = {js_undefined: true}, num = (s: string) => ({js_number: s})
const lone = {utf16: [0x61, 0xD83D]}, astral = "a😀b", flag = "🇩🇪x"

type Step = Record<string, any>
const cases: {note: string, input: any}[] = []
/** A program: its steps, and an `out` that names every variable listed. */
function prog(note: string, steps: Step[], out: string[] | object) {
  cases.push({note, input: {note, steps, out: Array.isArray(out) ? Object.fromEntries(out.map(n => [n, $(n)])) : out}})
}
/** A bare expression. */
function bare(note: string, expr: object) { cases.push({note, input: {note, ...expr}}) }
const as = (name: string, e: Step) => ({...e, as: name})
const values: [string, any][] = [["zero", 0], ["one", 1], ["minusZero", num("-0")], ["nan", num("NaN")], ["inf", num("Infinity")],
  ["empty", ""], ["str", "a"], ["nul", null], ["undef", und], ["yes", true], ["no", false], ["arr", []], ["obj", {}]]
const lets = values.map(([n, v]) => as(n, op("let", {value: v})))

// --- inputs, steps, variables, out
bare("a bare expression is a program of one step", op("let", {value: [1, "a", null, und, num("NaN"), num("-0"), lone]}))
bare("a bare expression that throws: an unset variable", op("not", {of: $("missing")}))
bare("a bare expression that throws: an unknown op", op("not", {of: op("no.such.op")}))
prog("steps run in order and a later step replaces a variable", [as("x", op("let", {value: 1})), as("y", op("let", {value: $("x")})), as("x", op("let", {value: 2}))], ["x", "y"])
prog("a step whose `if` is falsy does not run", [...lets,
  ...values.map(([n]) => ({...as("ran_" + n, op("label", {text: "ran"})), if: $(n)})),
  as("seen", op("list", {of: values.map(([n]) => op("capture", {do: $("ran_" + n)}))}))], ["seen"])
prog("out: a nested template", [as("a", op("let", {value: 1})), as("b", op("let", {value: "x"}))], {top: $("a"), list: [$("a"), [$("b")], {deep: $("b")}], same: {a: $("a")}})
prog("out names an unset variable: the output is the error", [as("a", op("let", {value: 1}))], {a: $("a"), b: $("b")})
prog("an uncaught throw in a step is the output", [as("a", op("let", {value: 1})), as("b", op("label", {text: 1})), as("c", op("let", {value: 2}))], ["a", "c"])
prog("a step with no `as` stores nothing", [op("let", {value: 1}), as("r", op("capture", {do: $("x")}))], ["r"])
prog("a `map` used as a step stores nothing under `as`, and its variable stays set", [as("xs", op("let", {value: [1, 2, 3]})), op("map", {over: $("xs"), as: "k", do: $("k")}), as("last", op("let", {value: $("k")}))], ["last"])
prog("outputs are encoded: undefined, NaN, -0, the infinities, a lone surrogate, a hole-free array", [...lets, as("l", op("let", {value: lone})), as("neg", op("div", {a: -1, b: 0}))], [...values.map(([n]) => n), "l", "neg"])

// --- same, allSame, sameItems
prog("same: primitives by value, NaN unequal to itself, 0 equal to -0, null and undefined apart", [...lets,
  as("r", op("list", {of: [
    op("same", {a: $("one"), b: $("one")}), op("same", {a: $("zero"), b: $("minusZero")}), op("same", {a: $("nan"), b: $("nan")}),
    op("same", {a: $("nul"), b: $("undef")}), op("same", {a: $("nul"), b: $("nul")}), op("same", {a: $("undef"), b: $("undef")}),
    op("same", {a: $("empty"), b: $("zero")}), op("same", {a: $("str"), b: $("str")}), op("same", {a: $("yes"), b: $("one")})]}))], ["r"])
prog("same: references by identity", [as("a", op("let", {value: [1]})), as("b", op("let", {value: [1]})), as("c", op("let", {value: $("a")})),
  as("o", op("object")), as("p", op("object")), as("d", op("copy", {of: $("a")})),
  as("r", op("list", {of: [op("same", {a: $("a"), b: $("b")}), op("same", {a: $("a"), b: $("c")}), op("same", {a: $("o"), b: $("p")}),
    op("same", {a: $("o"), b: $("o")}), op("same", {a: $("a"), b: $("d")})]}))], ["r"])
prog("allSame", [as("a", op("let", {value: [1]})), as("r", op("list", {of: [
  op("allSame", {of: op("list", {of: []})}), op("allSame", {of: op("list", {of: [$("a")]})}), op("allSame", {of: op("list", {of: [$("a"), $("a"), $("a")]})}),
  op("allSame", {of: op("list", {of: [$("a"), op("copy", {of: $("a")})]})}), op("allSame", {of: op("let", {value: [1, 1, 1]})}),
  op("allSame", {of: op("let", {value: [1, 1, 2]})}), op("allSame", {of: op("let", {value: [num("NaN"), num("NaN")]})})]}))], ["r"])
prog("sameItems: by the members of a; b may be longer or shorter", [as("x", op("object")), as("y", op("object")), as("r", op("list", {of: [
  op("sameItems", {a: op("list", {of: [$("x"), $("y")]}), b: op("list", {of: [$("x"), $("y")]})}),
  op("sameItems", {a: op("list", {of: [$("x"), $("y")]}), b: op("list", {of: [$("y"), $("x")]})}),
  op("sameItems", {a: op("list", {of: [$("x")]}), b: op("list", {of: [$("x"), $("y")]})}),
  op("sameItems", {a: op("list", {of: [$("x"), $("y")]}), b: op("list", {of: [$("x")]})}),
  op("sameItems", {a: op("list", {of: []}), b: op("list", {of: [$("x")]})}),
  op("sameItems", {a: op("let", {value: [1, "a", null]}), b: op("let", {value: [1, "a", null]})})]}))], ["r"])

// --- all, not
prog("not: truthiness of every kind of value", [...lets, as("r", op("list", {of: values.map(([n]) => op("not", {of: $(n)}))}))], ["r"])
prog("all: stops at the first falsy value, so a later error is not reached", [...lets, as("r", op("list", {of: [
  op("all", {of: []}), op("all", {of: [$("one"), $("str"), $("arr"), $("obj")]}), op("all", {of: [$("one"), $("zero"), $("missing")]}),
  op("all", {of: [$("nan")]}), op("all", {of: [$("empty")]}), op("capture", {do: op("all", {of: [$("one"), $("missing")]})})]}))], ["r"])

// --- count, slice, item, column, copy, lengths
prog("count: an array's members, a string's UTF-16 code units", [as("r", op("list", {of: [
  op("count", {of: op("let", {value: []})}), op("count", {of: op("let", {value: [1, [2, 3]]})}), op("count", {of: op("let", {value: ""})}),
  op("count", {of: op("let", {value: "abc"})}), op("count", {of: op("let", {value: astral})}), op("count", {of: op("let", {value: flag})}),
  op("count", {of: op("let", {value: lone})}), op("count", {of: op("let", {value: "é中"})})]}))], ["r"])
prog("slice of an array: start, end, negative and out-of-range indexes", [as("a", op("let", {value: [0, 1, 2, 3, 4]})), as("r", op("list", {of: [
  op("slice", {of: $("a"), start: 1}), op("slice", {of: $("a"), start: 1, end: 3}), op("slice", {of: $("a"), start: -2}),
  op("slice", {of: $("a"), start: 0, end: -1}), op("slice", {of: $("a"), start: 3, end: 1}), op("slice", {of: $("a"), start: 9}),
  op("slice", {of: $("a"), start: -9, end: 99}), op("same", {a: op("slice", {of: $("a"), start: 0}), b: $("a")})]}))], ["r"])
prog("slice of a string: by UTF-16 code units, halves of a pair included", [as("s", op("let", {value: astral})), as("r", op("list", {of: [
  op("slice", {of: $("s"), start: 1}), op("slice", {of: $("s"), start: 0, end: 2}), op("slice", {of: $("s"), start: 2}),
  op("slice", {of: $("s"), start: 1, end: 3}), op("slice", {of: $("s"), start: -1}), op("slice", {of: $("s"), start: 4})]}))], ["r"])
prog("item: of an array and of a string, out of range gives undefined", [as("a", op("let", {value: [10, [20], null]})), as("s", op("let", {value: astral})), as("r", op("list", {of: [
  op("item", {of: $("a"), index: 0}), op("item", {of: $("a"), index: 1}), op("item", {of: $("a"), index: 2}), op("item", {of: $("a"), index: 3}),
  op("item", {of: $("a"), index: -1}), op("item", {of: $("s"), index: 0}), op("item", {of: $("s"), index: 1}), op("item", {of: $("s"), index: 2}),
  op("item", {of: $("s"), index: 3}), op("item", {of: $("s"), index: 4}),
  op("same", {a: op("item", {of: $("a"), index: 1}), b: op("item", {of: $("a"), index: 1})})]}))], ["r"])
prog("item: a key of an object", [as("o", op("record", {of: {a: 1, b: [2]}})), as("r", op("list", {of: [op("item", {of: $("o"), index: "a"}), op("item", {of: $("o"), index: "b"}), op("item", {of: $("o"), index: "c"})]}))], ["r"])
prog("column", [as("r", op("list", {of: [
  op("column", {of: op("let", {value: [[1, "a"], [2, "b"], [3]]}), index: 1}), op("column", {of: op("let", {value: []}), index: 0}),
  op("column", {of: op("let", {value: [{k: 1}, {k: null}, {}]}), index: "k"}), op("column", {of: op("let", {value: ["ab", "c"]}), index: 1})]}))], ["r"])
prog("copy: a new array with the same members", [as("in", op("let", {value: [1]})), as("a", op("list", {of: [$("in"), 2]})), as("b", op("copy", {of: $("a")})),
  op("array.push", {of: $("b"), value: 3}), as("sameArray", op("same", {a: $("a"), b: $("b")})),
  as("sameMember", op("same", {a: op("item", {of: $("a"), index: 0}), b: op("item", {of: $("b"), index: 0})}))], ["a", "b", "sameArray", "sameMember"])
prog("lengths", [as("r", op("list", {of: [op("lengths", {of: op("let", {value: ["", "ab", astral, [1, 2, 3], []]})}), op("lengths", {of: op("let", {value: []})})]}))], ["r"])

// --- jsonEqual, object, label
prog("jsonEqual: as JSON.stringify writes the two values", [as("r", op("list", {of: [
  op("jsonEqual", {a: op("let", {value: [1, {a: 2}]}), b: op("let", {value: [1, {a: 2}]})}),
  op("jsonEqual", {a: op("let", {value: {a: 1, b: 2}}), b: op("let", {value: {b: 2, a: 1}})}),
  op("jsonEqual", {a: op("let", {value: [und]}), b: op("let", {value: [null]})}),
  op("jsonEqual", {a: op("let", {value: [num("NaN")]}), b: op("let", {value: [null]})}),
  op("jsonEqual", {a: op("let", {value: {a: und}}), b: op("let", {value: {}})}),
  op("jsonEqual", {a: op("let", {value: num("-0")}), b: op("let", {value: 0})}),
  op("jsonEqual", {a: op("let", {value: und}), b: op("let", {value: und})}),
  op("jsonEqual", {a: op("let", {value: "1"}), b: op("let", {value: 1})}),
  op("jsonEqual", {a: op("let", {value: 0.5}), b: op("let", {value: 0.5})})]}))], ["r"])
prog("object: a new empty object each time", [as("a", op("object")), as("b", op("object")), as("same", op("same", {a: $("a"), b: $("b")}))], ["a", "same"])
prog("label: the text, a string only", [as("a", op("label", {text: "reached"})), as("b", op("capture", {do: op("label", {text: 1})})), as("c", op("capture", {do: op("label", {})}))], ["a", "b", "c"])

// --- map
prog("map: each element in order, nested, over an empty list", [as("xs", op("let", {value: [1, 2, 3]})), as("r", op("list", {of: [
  op("map", {over: $("xs"), as: "x", do: op("list", {of: [$("x"), $("x")]})}),
  op("map", {over: op("let", {value: []}), as: "x", do: $("missing")}),
  op("map", {over: $("xs"), as: "x", do: op("map", {over: op("ints", {from: 0, below: $("x")}), as: "y", do: op("concat", {of: [$("x"), ":", $("y")]})})})]}))], ["r"])
prog("map: a throw in `do` leaves the map", [as("xs", op("let", {value: [1, 2]})), as("r", op("capture", {do: op("map", {over: $("xs"), as: "x", do: $("missing")})})), as("x", op("let", {value: $("x")}))], ["r", "x"])

// --- try, block, capture
for (const mode of ["okOrError", "noErrorOrMessage", "okValueOrError", "okOrMessage"]) {
  prog(`try, mode ${mode}`, [
    as("plain", op("try", {mode, steps: [as("v", op("let", {value: 7}))], result: "v"})),
    as("noResult", op("try", {mode, steps: [as("w", op("let", {value: 8}))]})),
    as("undefinedResult", op("try", {mode, steps: [as("u", op("let", {value: und}))], result: "u"})),
    as("threw", op("try", {mode, steps: [as("before", op("let", {value: 1})), as("t", op("label", {text: 2})), as("after", op("let", {value: 3}))], result: "after"})),
    as("unset", op("try", {mode, steps: [as("q", op("let", {value: $("missing")}))], result: "q"})),
    as("resultUnset", op("try", {mode, steps: [], result: "never"})),
    as("kept", op("list", {of: [$("v"), $("w"), $("before"), op("capture", {do: $("after")})]}))], ["plain", "noResult", "undefinedResult", "threw", "unset", "resultUnset", "kept"])
}
prog("try: an unknown mode", [as("a", op("capture", {do: op("try", {mode: "other", steps: []})})), as("b", op("capture", {do: op("try", {mode: "other", steps: [as("x", op("label", {text: 0}))]})}))], ["a", "b"])
prog("block: runs its steps and gives a variable; its variables stay set", [as("r", op("block", {steps: [as("a", op("let", {value: 1})), as("b", op("list", {of: [$("a"), 2]}))], result: "b"})), as("a2", op("let", {value: $("a")})),
  as("unset", op("capture", {do: op("block", {steps: [], result: "nothing"})})), as("threw", op("capture", {do: op("block", {steps: [as("z", op("label", {text: null}))], result: "z"})}))], ["r", "a2", "unset", "threw"])
prog("capture: a value or the error's name and message", [as("r", op("list", {of: [
  op("capture", {do: op("let", {value: [1, und]})}), op("capture", {do: $("missing")}), op("capture", {do: op("no.such.op")}),
  op("capture", {do: op("capture", {do: $("missing")})}), op("capture", {do: op("let", {value: und})})]}))], ["r"])

// --- let, list, record, merge
prog("let: data as it is, an expression's value; data members are not evaluated", [as("a", op("let", {value: 1})), as("r", op("list", {of: [
  op("let", {value: $("a")}), op("let", {value: [$("a")]}), op("let", {value: {k: op("let", {value: 1})}}), op("let", {value: null}), op("let", {value: "s"}),
  op("same", {a: op("let", {value: $("a")}), b: $("a")})]}))], ["r"])
prog("list: members are evaluated or data; a new array each time", [as("a", op("let", {value: [1]})), as("l", op("list", {of: [$("a"), [$("a")], 2, null, und, op("list", {of: []})]})),
  as("first", op("same", {a: op("item", {of: $("l"), index: 0}), b: $("a")})), as("fresh", op("same", {a: op("list", {of: []}), b: op("list", {of: []})}))], ["l", "first", "fresh"])
prog("record: the keys in order, values evaluated or data", [as("a", op("let", {value: [1]})), as("o", op("record", {of: {z: $("a"), a: 2, m: {n: $("a")}, u: und}})),
  as("first", op("same", {a: op("item", {of: $("o"), index: "z"}), b: $("a")})), as("empty", op("record", {of: {}}))], ["o", "first", "empty"])
prog("merge: later objects replace keys, the first position of a key is kept", [as("a", op("record", {of: {x: 1, y: 2}})), as("b", op("record", {of: {y: 3, z: 4}})), as("r", op("list", {of: [
  op("merge", {of: [$("a"), $("b")]}), op("merge", {of: [$("b"), $("a")]}), op("merge", {of: []}), op("merge", {of: [$("a")]}),
  op("same", {a: op("merge", {of: [$("a")]}), b: $("a")})]})), as("untouched", op("let", {value: $("a")}))], ["r", "untouched"])

// --- ints, floor, div, concat, countOf, array.push
prog("ints: to is inclusive, below is not, step defaults to 1; arguments may be expressions", [as("n", op("let", {value: 3})), as("r", op("list", {of: [
  op("ints", {from: 0, to: 3}), op("ints", {from: 0, below: 3}), op("ints", {from: 3, to: 0}), op("ints", {from: 0, below: 0}), op("ints", {from: -2, to: 2, step: 2}),
  op("ints", {from: 0, to: $("n")}), op("ints", {from: $("n"), below: op("count", {of: op("let", {value: "abcde"})}), step: op("let", {value: 1})}),
  op("ints", {from: 0, to: 2, step: 0.5}), op("ints", {from: 1, to: 10, step: 4}), op("ints", {from: 0, below: 2.5}), op("ints", {from: 0.5, to: 2})]}))], ["r"])
prog("floor", [as("r", op("list", {of: [op("floor", {of: 1.5}), op("floor", {of: -1.5}), op("floor", {of: -0.5}), op("floor", {of: 2}), op("floor", {of: num("NaN")}), op("floor", {of: num("-Infinity")}),
  op("floor", {of: op("div", {a: 7, b: 2})}), op("floor", {of: op("div", {a: -7, b: 2})})]}))], ["r"])
prog("div: JavaScript's /", [as("r", op("list", {of: [op("div", {a: 6, b: 3}), op("div", {a: 1, b: 2}), op("div", {a: 1, b: 0}), op("div", {a: -1, b: 0}), op("div", {a: 0, b: 0}),
  op("div", {a: 0, b: -1}), op("div", {a: op("count", {of: op("let", {value: astral})}), b: 2}), op("div", {a: 1, b: 4})]}))], ["r"])
prog("concat: String() of each value", [...lets, as("r", op("list", {of: [
  op("concat", {of: []}), op("concat", {of: ["a", 1, "b"]}), op("concat", {of: [$("one"), $("zero"), $("minusZero")]}), op("concat", {of: [$("nan"), "|", $("inf")]}),
  op("concat", {of: [$("nul"), "|", $("undef")]}), op("concat", {of: [$("yes"), $("no")]}), op("concat", {of: [op("let", {value: [1, [2, 3], null, "x"]})]}),
  op("concat", {of: [$("obj")]}), op("concat", {of: [0.5, "|", -1.25, "|", 100]}), op("concat", {of: [astral, lone]}), op("concat", {of: [op("div", {a: 1, b: 4})]})]}))], ["r"])
prog("countOf: members that are === the value", [as("x", op("object")), as("l", op("list", {of: [1, "1", 1, null, und, $("x"), op("object"), num("NaN")]})), as("r", op("list", {of: [
  op("countOf", {of: $("l"), value: 1}), op("countOf", {of: $("l"), value: "1"}), op("countOf", {of: $("l"), value: null}), op("countOf", {of: $("l"), value: und}),
  op("countOf", {of: $("l"), value: $("x")}), op("countOf", {of: $("l"), value: num("NaN")}), op("countOf", {of: $("l"), value: 2})]}))], ["r"])
prog("array.push: changes the array every holder of it sees, and returns undefined", [as("a", op("list", {of: []})), as("holder", op("list", {of: [$("a")]})), as("r1", op("array.push", {of: $("a"), value: 1})),
  op("array.push", {of: $("a"), value: op("list", {of: [2]})}), op("array.push", {of: $("a"), value: $("a")}), as("n", op("count", {of: $("a")})),
  as("inner", op("count", {of: op("item", {of: $("holder"), index: 0})})), as("self", op("same", {a: op("item", {of: $("a"), index: 2}), b: $("a")})),
  as("head", op("slice", {of: $("a"), start: 0, end: 2}))], ["r1", "n", "inner", "self", "head"])

const out = cases.map((c, i) => JSON.stringify({id: "L" + String(i + 1).padStart(3, "0"), input: encode(c.input), output: lang.run(encode(c.input))})).join("\n") + "\n"
const file = fileURLToPath(import.meta.url).replace(/\.ts$/, ".jsonl")
const ran = new Set<string>()
for (const [name, def] of lang.ops) { const run = def.run; def.run = (a, p) => { ran.add(name); return run(a, p) } }
for (const c of cases) lang.run(encode(c.input))
const unrun = [...lang.ops.keys()].filter(n => !ran.has(n))
if (process.argv[2] == "--check") {
  const same = existsSync(file) && readFileSync(file, "utf8") == out
  process.stdout.write(JSON.stringify({cases: cases.length, same, unrun}) + "\n")
  process.exit(same && !unrun.length ? 0 : 1)
} else {
  writeFileSync(file, out)
  process.stdout.write(JSON.stringify({cases: cases.length, wrote: "tools/cm6/lang-cases.jsonl", unrun}) + "\n")
}
