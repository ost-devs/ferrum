// The one language of fixture inputs (docs/workflow/specification.md §5 item 3). Imported as "@harness/program".
// A chunk's interpreter (docs/parity/<crate>/oracle/cm6/<chunk>/interp.ts) creates a `Language`, registers its ops
// on it and exports it as `lang`, with `run = lang.run`. A generator builds an input as data and records
// `run(input)` beside it; tools/cm6/replay.ts runs every recorded input again (tools/spec_check.py). The crate's
// fixture replayer implements this file once, and each chunk's ops from the header of its interpreter.
//
// An input is one of
//   a program           {"steps": [step], "out": template, ...setup keys of the chunk, ...descriptive keys}
//   a bare expression   {"op": "<op>", ...arguments, ...descriptive keys}: a program of one step whose value is
//                       the output.
// The input is read with `decode` (tools/cm6/oracle-lib.ts) first, so {"js_undefined": true} is undefined and so on.
// The output is {"ok": value} or, when a step throws outside a `try`, {"error": {name, message}}, the value encoded
// by `encode`. A message is cm6's text: where cm6 writes a position, offset or length into it, the number counts
// UTF-16 code units like every other position of an output (the crate's plan says which messages hold one and on
// which text each number is measured). An output holds what cm6 gives its caller and nothing about cm6's source: where an uncaught throw
// came from (`throwSite`) is kept beside the run in `Language.thrownAt`, which tools/cm6/replay.ts reports and
// tools/spec_check.py compares with raw/throws.jsonl.
// - Setup keys: what the chunk builds before the steps run (the header of its interpreter names them).
// - Descriptive keys: top-level keys no op reads (a seed, a case name, a note). The chunk's interpreter names them;
//   every other key of an input must be read when the input runs.
//
// Step: an expression, with optional "as": "<name>" (its value is stored in that variable) and optional
//   "if": <expr> (the step runs only when the expression's value is truthy). Steps run in order.
// Expression (written <expr> in an op's arguments; every other argument is data):
//   {"$": "<name>"}             the value of a variable; an error when it is unset
//   {"op": "<op>", ...arguments}    the value of an op
// out: a template. Each {"$": "<name>"} in it is replaced by the variable's value; arrays and other objects are
//   copied with their members filled the same way. Every leaf of a template is such a reference: an expected value
//   is never written in the input.
//
// Ops of the language (kind `harness`: they touch no cm6 value; `same`, `allSame` and `sameItems` are also kind
// `identity`: they compare with ===, which for objects is JavaScript object identity). Result in brackets:
//   same {a: expr, b: expr}           [a === b]
//   allSame {of: expr}                [value.every(x => x === value[0])]
//   sameItems {a: expr, b: expr}      [a.every((x, i) => x === b[i])]
//   all {of: [expr]}                  [true when every expression's value is truthy (evaluated left to right,
//                                      stopping at the first falsy one), else false]
//   not {of: expr}                    [!value]
//   count {of: expr}                  [value.length]
//   slice {of: expr, start, end?}     [value.slice(start) or value.slice(start, end)]
//   item {of: expr, index}            [value[index]]
//   column {of: expr, index}          [value.map(x => x[index])]
//   copy {of: expr}                   [value.slice()]
//   lengths {of: expr}                [value.map(x => x.length)]
//   jsonEqual {a: expr, b: expr}      [JSON.stringify(a) == JSON.stringify(b)]
//   object {}                         [a new empty object {}]
//   label {text}                      [text, a string: a word the output carries beside cm6's values to say which
//                                      step was reached. It shows nothing about cm6. It is the only way a value
//                                      written in the input reaches the output; tools/spec_check.py lists the labels]
//   map {over: expr, as: name, do: expr}   [for each element of the list `over`, in order: the variable `as` is set
//                                      to it and `do` is evaluated; the list of those values. Here `as` names the
//                                      element's variable, not the step's result: a `map` used as a step stores
//                                      nothing]
//   try {steps: [step], mode, result?}    runs the steps (their variables stay set); r = the variable `result` after
//       them (undefined when `result` is absent). On a throw, e is the thrown error. The op's value by mode:
//         "okOrError":        "ok" | {error: e.constructor.name, message: e.message}
//         "noErrorOrMessage": "no error" | {error: e.message}
//         "okValueOrError":   {ok: r, or "returned undefined" when r is undefined} | {error: e.constructor.name,
//                             message: e.message}
//         "okOrMessage":      "ok" | e.message
// Values the program builds (kind `harness`; each was registered by more than one chunk, with one implementation that
// replays every fixture of those chunks, and moved here). An argument written `arg` is an <expr> (evaluated) or data
// (used as it is and read whole with `markRead`); the members of data are not evaluated.
//   let {value: arg}                  [the value]
//   list {of: [arg]}                  [a new array of the members' values, in order]
//   record {of: {key: arg}}           [a new object with the same keys, in the same order, holding the values]
//   merge {of: [expr]}                [Object.assign({}, ...values)]
//   block {steps: [step], result}     [runs the steps (their variables stay set); the variable `result` after them]
//   capture {do: expr}                [{ok: value} or, when evaluating `do` throws e, {error: {name: e.name ("Error"
//                                      when absent), message: String(e.message), String(e) when e has none}}; on a
//                                      throw, the rest of `do` counts as read]
//   ints {from: arg, to?: arg, below?: arg, step?: arg}   [the numbers from, from + step, ... (step default 1) while
//                                      <= to when `to` is present, else while < below; evaluated in the order from,
//                                      step, to or below]
//   floor {of: arg}                   [Math.floor(value)]
//   div {a: arg, b: arg}              [a / b]
//   concat {of: [arg]}                [the concatenation of String(value) of each value]
//   countOf {of: expr, value: arg}    [the number of members of the array that are === value]
//   array.push {of: expr, value: arg} [of.push(value); undefined]
//
// Kinds: what an op observes, so that the crate's design can say what its replayer does with each
// (specification.md §5 item 3). Every op is registered with one or more of
//   api        calls or reads a member cm6 exports and documents
//   internal   reads, replaces or depends on a member cm6 marks @internal or does not export, or on its internal layout
//   identity   its result depends on JavaScript object identity
//   callbacks  observes how often or in which order cm6 calls a function the input supplies, beyond what the call returns
//   harness    touches no cm6 value
//
// Reading every part of an input. Replay records each key that is read and fails on a key nothing read: such a key
// says something about the run that the run does not do. So the evaluator reads what it skips, with `markRead`: a
// step whose `if` is false, the steps and `out` after an uncaught throw, the steps and `result` of a `try` that
// threw. An op that builds a callback from a spec calls `markRead(spec)` when it builds it: cm6 may never call it.
import {encode, decode} from "@harness/lib"

export type Kind = "api" | "internal" | "identity" | "callbacks" | "harness"
export const KINDS: readonly Kind[] = ["api", "internal", "identity", "callbacks", "harness"]
type OpFn = (a: any, p: Program) => any

/** Read every key of x, at any depth (see "Reading every part of an input"). */
export function markRead(x: any): void {
  if (x && typeof x == "object") for (const k of Object.keys(x)) markRead(x[k])
}

const isExpr = (x: any) => !!x && typeof x == "object" && !Array.isArray(x) && ("$" in x || "op" in x)
/** An `arg`: an expression's value, or the data as it is (read whole). */
function arg(p: Program, x: any): any { if (isExpr(x)) return p.ev(x); markRead(x); return x }

/** One run of one input: its variables and what the chunk's setup built (`chunk`). */
export class Program {
  vars: Record<string, any> = Object.create(null)
  /** What the chunk's setup returned for this input. */
  chunk: any = undefined
  constructor(readonly lang: Language) {}
  /** The value of a variable. */
  get(name: string): any {
    if (!(name in this.vars)) throw new Error("interp: unset variable " + name)
    return this.vars[name]
  }
  /** The value of an expression. */
  ev(x: any): any {
    if (x && typeof x == "object" && !Array.isArray(x)) {
      if ("$" in x) return this.get(x.$)
      if ("op" in x) return this.op(x)
    }
    throw new Error("interp: not an expression: " + JSON.stringify(x))
  }
  evs(xs: any[]): any[] { return xs.map(x => this.ev(x)) }
  op(a: any): any {
    const def = this.lang.ops.get(a.op)
    if (!def) throw new Error("interp: unknown op " + a.op)
    this.lang.ran.add(a.op)
    return def.run(a, this)
  }
  steps(steps: any[]): void {
    for (const s of steps) {
      if ("if" in s && !this.ev(s.if)) { markRead(s); continue }
      const r = this.op(s)
      if (s.as !== undefined && s.op != "map") this.vars[s.as] = r
    }
  }
  fill(t: any): any {
    if (Array.isArray(t)) return t.map(x => this.fill(x))
    if (t && typeof t == "object") {
      if ("$" in t && Object.keys(t).length == 1) return this.get(t.$)
      return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, this.fill(v)]))
    }
    return t
  }
}

/** The first frame of an error's stack inside a cm6 package's source, as "mirrors/cm6/<package>/src/<file>:<line>";
 * "" when the stack has none (the error was thrown by the interpreter, by a callback of the input, or by a
 * dependency of the package). */
export function throwSite(e: any): string {
  const m = /\/cm6\/([\w-]+)\/src\/([\w./-]+\.ts):(\d+)/.exec(String(e?.stack ?? ""))
  return m ? `mirrors/cm6/${m[1]}/src/${m[2]}:${m[3]}` : ""
}

/** A chunk's interpreter: the language's ops plus the ones the chunk registers. */
export class Language {
  ops = new Map<string, {kinds: Kind[], run: OpFn}>()
  /** The ops the last `evaluate` ran. */
  ran = new Set<string>()
  /** Where the last `evaluate` ended in an uncaught throw (`throwSite`), else null. It is not part of the output. */
  thrownAt: string | null = null
  /** `descriptive`: the top-level input keys no op reads. `setup`: builds, from the decoded input, what the chunk's
   * ops need before the steps run (it becomes `p.chunk`); it runs inside the capture, so a throw in it is an output. */
  constructor(readonly chunk: string, readonly descriptive: readonly string[], readonly setup?: (input: any, p: Program) => any) {
    const o = (name: string, kinds: Kind[], run: OpFn) => this.op(name, kinds, run)
    o("same", ["harness", "identity"], (a, p) => p.ev(a.a) === p.ev(a.b))
    o("allSame", ["harness", "identity"], (a, p) => { const v = p.ev(a.of); return v.every((x: any) => x === v[0]) })
    o("sameItems", ["harness", "identity"], (a, p) => { const x = p.ev(a.a), y = p.ev(a.b); return x.every((e: any, i: number) => e === y[i]) })
    o("all", ["harness"], (a, p) => { for (const x of a.of) if (!p.ev(x)) { markRead(a.of); return false } return true })
    o("not", ["harness"], (a, p) => !p.ev(a.of))
    o("count", ["harness"], (a, p) => p.ev(a.of).length)
    o("slice", ["harness"], (a, p) => "end" in a ? p.ev(a.of).slice(a.start, a.end) : p.ev(a.of).slice(a.start))
    o("item", ["harness"], (a, p) => p.ev(a.of)[a.index])
    o("column", ["harness"], (a, p) => p.ev(a.of).map((x: any) => x[a.index]))
    o("copy", ["harness"], (a, p) => p.ev(a.of).slice())
    o("lengths", ["harness"], (a, p) => p.ev(a.of).map((x: any) => x.length))
    o("jsonEqual", ["harness"], (a, p) => JSON.stringify(p.ev(a.a)) == JSON.stringify(p.ev(a.b)))
    o("object", ["harness"], () => ({}))
    o("label", ["harness"], a => { if (typeof a.text != "string") throw new Error("label: text must be a string"); return a.text })
    o("map", ["harness"], (a, p) => {
      const over = p.ev(a.over)
      if (!over.length) markRead(a.do)
      return over.map((x: any) => { p.vars[a.as] = x; return p.ev(a.do) })
    })
    o("try", ["harness"], (a, p) => {
      try {
        p.steps(a.steps)
        const r = a.result === undefined ? undefined : p.get(a.result)
        switch (a.mode) {
          case "okOrError": case "okOrMessage": return "ok"
          case "noErrorOrMessage": return "no error"
          case "okValueOrError": return {ok: r === undefined ? "returned undefined" : r}
        }
      } catch (e: any) {
        markRead(a.steps); void a.result
        switch (a.mode) {
          case "okOrError": case "okValueOrError": return {error: e.constructor.name, message: e.message}
          case "noErrorOrMessage": return {error: e.message}
          case "okOrMessage": return e.message
        }
      }
      throw new Error("interp: bad try mode " + a.mode)
    })
    // values the program builds
    o("let", ["harness"], (a, p) => arg(p, a.value))
    o("list", ["harness"], (a, p) => a.of.map((x: any) => arg(p, x)))
    o("record", ["harness"], (a, p) => Object.fromEntries(Object.keys(a.of).map(k => [k, arg(p, a.of[k])])))
    o("merge", ["harness"], (a, p) => Object.assign({}, ...p.evs(a.of)))
    o("block", ["harness"], (a, p) => { p.steps(a.steps); return p.get(a.result) })
    o("capture", ["harness"], (a, p) => {
      try { return {ok: p.ev(a.do)} } catch (e: any) { markRead(a.do); return {error: {name: e?.name ?? "Error", message: String(e?.message ?? e)}} }
    })
    o("ints", ["harness"], (a, p) => {
      const from = arg(p, a.from), step = "step" in a ? arg(p, a.step) : 1, out: number[] = []
      if ("to" in a) { const to = arg(p, a.to); for (let i = from; i <= to; i += step) out.push(i) }
      else { const below = arg(p, a.below); for (let i = from; i < below; i += step) out.push(i) }
      return out
    })
    o("floor", ["harness"], (a, p) => Math.floor(arg(p, a.of)))
    o("div", ["harness"], (a, p) => arg(p, a.a) / arg(p, a.b))
    o("concat", ["harness"], (a, p) => a.of.map((x: any) => String(arg(p, x))).join(""))
    o("countOf", ["harness"], (a, p) => { const v = arg(p, a.value); return p.ev(a.of).filter((x: any) => x === v).length })
    o("array.push", ["harness"], (a, p) => { p.ev(a.of).push(arg(p, a.value)); return undefined })
  }
  /** Register an op of the chunk with its kinds (the list in this file's header). */
  op(name: string, kinds: Kind[], run: OpFn): this {
    if (this.ops.has(name)) throw new Error(`interp: op ${name} registered twice`)
    for (const k of kinds) if (!KINDS.includes(k)) throw new Error(`interp: op ${name}: unknown kind ${k}`)
    this.ops.set(name, {kinds, run})
    return this
  }
  /** Run a decoded input (replay passes one that records what is read). */
  evaluate(inp: any): {ok: any} | {error: {name: string, message: string}} {
    this.ran = new Set(); this.thrownAt = null
    const program = Array.isArray(inp?.steps)
    try {
      const p = new Program(this)
      if (this.setup) p.chunk = this.setup(inp, p)
      if (!program) return {ok: encode(p.ev(inp))}
      p.steps(inp.steps)
      return {ok: encode(p.fill(inp.out))}
    } catch (e: any) {
      if (program) { markRead(inp.steps); markRead(inp.out) } else markRead(inp)
      this.thrownAt = throwSite(e)
      return {error: {name: e?.name ?? "Error", message: String(e?.message ?? e)}}
    }
  }
  /** Run one fixture input, as read from the fixture file or as a generator built it, and return its output. */
  run = (input: any) => this.evaluate(decode(input))
}
