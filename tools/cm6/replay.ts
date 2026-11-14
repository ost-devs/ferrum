// Replay of recorded fixture inputs (docs/workflow/specification.md §8 item 1), run by tools/spec_check.py:
//   npx tsx --tsconfig .harness/<package>/tsconfig.json tools/cm6/replay.ts <crate> [--ran] <chunk> [<chunk> ...]
// (--ran: only which ops each fixture ran, for tools/spec_facts.py)
//   npx tsx --tsconfig .harness/<package>/tsconfig.json tools/cm6/replay.ts <crate> --trace <chunk> <fixture id>
// (--trace: what every op of one fixture evaluated to on cm6, for finding where a crate's replayer first differs; the
// lines are described at `traceOne`; the chunk `lang` names the cases of tools/cm6/lang-cases.jsonl)
// from the repository root. For every fixture of docs/parity/<crate>/fixtures/<chunk>.jsonl it decodes the recorded
// input, wraps it so that every key read by the interpreter or by cm6 is recorded, runs it through the `lang` that
// docs/parity/<crate>/oracle/cm6/<chunk>/interp.ts exports (tools/cm6/program.ts), and compares the encoded output
// with the recorded one. A fixture whose recorded output is {"timeout": ms} runs in a child process with that limit
// (`runIsolated`) and must be cut off again. It prints one JSON line per chunk:
//   {chunk, error?}            error: the chunk has no interpreter in the language yet
//   fixtures                   the number replayed
//   differ: [ids]              the replayed output is not the recorded one
//   unread: {path: fixtures}   input keys nothing read, outside the descriptive keys the interpreter names; array
//                              indexes are written []; unreadFixtures: the fixtures that have one
//   descriptiveText: [ids]     a descriptive key that holds a call as text (a string under expr, call or code; a
//                              string with a parenthesis, a space or = under op, ops or calls)
//   literalOut: [ids]          an `out` template with a leaf that is not {"$": name}: an expected value in the input
//   noCm6Op: [ids]             the run reached no op of kind api or internal: the fixture shows nothing of cm6
//   thrown: {id: site}         the fixtures whose run ends in a throw nothing caught, with where cm6 threw
//                              (`throwSite` of tools/cm6/program.ts: "mirrors/cm6/<package>/src/<file>:<line>", ""
//                              when the stack has no frame in a cm6 package's source). The site is not in the output
//   opsWithoutKinds: [ops]     registered with no kind
//   opsNotInHeader: [ops]      not named in the header of interp.ts (for an op of the language: of program.ts)
//   evalUse: [files]           eval or Function in a file of the chunk
//   ops: [{op, kinds, fixtures, behaviors}]   per op that ran: what tools/spec_check.py writes to raw/fixture-ops.jsonl
import {readFileSync, readdirSync, existsSync} from "node:fs"
import {resolve, join} from "node:path"
import {pathToFileURL, fileURLToPath} from "node:url"
import {decode, encode, runIsolated, isolatedMain} from "@harness/lib"
import {Language} from "@harness/program"

const TEXT_KEYS = ["expr", "call", "code"], OP_KEYS = ["op", "ops", "calls"]
function jsText(key: string, v: any): boolean {
  if (Array.isArray(v)) return v.some(x => jsText(key, x))
  return typeof v == "string" && (TEXT_KEYS.includes(key) || (OP_KEYS.includes(key) && /[(\s=]/.test(v)))
}

/** A view of `root` that records the path of every own key read, at any depth. */
function tracked(root: any) {
  const read = new Set<string>(), cache = new WeakMap<object, any>()
  const wrap = (o: any, path: string): any => {
    if (!o || typeof o != "object") return o
    let px = cache.get(o)
    if (!px) cache.set(o, px = new Proxy(o, {get(t, k, r) {
      const v = Reflect.get(t, k, r)
      if (typeof k != "string" || !Object.prototype.hasOwnProperty.call(t, k) || (Array.isArray(t) && k == "length")) return v
      read.add(path + "/" + k)
      return wrap(v, path + "/" + k)
    }}))
    return px
  }
  return {view: wrap(root, ""), read}
}

function unreadPaths(inp: any, read: Set<string>, descriptive: readonly string[]): string[] {
  const out: string[] = []
  const walk = (o: any, path: string, shown: string) => {
    if (!o || typeof o != "object") return
    for (const k of Object.keys(o)) {
      if (path == "" && descriptive.includes(k)) continue
      const at = path + "/" + k, name = shown + "/" + (Array.isArray(o) ? "[]" : k)
      if (!read.has(at)) out.push(name); else walk(o[k], at, name)
    }
  }
  walk(inp, "", "")
  return [...new Set(out)]
}

function literalLeaf(t: any): boolean {
  if (Array.isArray(t)) return t.some(literalLeaf)
  if (t && typeof t == "object") return Object.keys(t).length == 1 && "$" in t ? false : Object.values(t).some(literalLeaf)
  return true
}

type One = {output: any, unread: string[], ran: string[], thrownAt: string | null}
function replayOne(lang: Language, input: any): One {
  const inp = decode(input), t = tracked(inp)
  const output = lang.evaluate(t.view)
  return {output, unread: unreadPaths(inp, t.read, lang.descriptive), ran: [...lang.ran], thrownAt: lang.thrownAt}
}

const interpPath = (crate: string, chunk: string) => resolve("docs", "parity", crate, "oracle", "cm6", chunk, "interp.ts")
const fixtures = (crate: string, chunk: string): any[] =>
  readFileSync(resolve("docs", "parity", crate, "fixtures", chunk + ".jsonl"), "utf8").split("\n").filter(l => l.trim()).map(l => JSON.parse(l))

async function chunkReport(crate: string, chunk: string) {
  const file = interpPath(crate, chunk)
  if (!existsSync(file)) return {chunk, error: "no interp.ts"}
  const lang: Language | undefined = (await import(pathToFileURL(file).href)).lang
  if (!(lang instanceof Language)) return {chunk, error: "interp.ts exports no `lang` of tools/cm6/program.ts"}
  const dir = resolve("docs", "parity", crate, "oracle", "cm6", chunk)
  const header = (src: string) => src.slice(0, Math.max(0, src.search(/^import /m)))
  const own = header(readFileSync(file, "utf8")), shared = header(readFileSync(fileURLToPath(import.meta.url).replace(/replay\.ts$/, "program.ts"), "utf8"))
  const language = new Set(new Language("", []).ops.keys())
  const named = (text: string, op: string) => new RegExp("(^|[^\\w.])" + op.replace(/[.$]/g, "\\$&") + "([^\\w.]|$)", "m").test(text)
  const rep = {chunk, fixtures: 0, differ: [] as string[], unread: {} as Record<string, number>, unreadFixtures: 0,
    descriptiveText: [] as string[], literalOut: [] as string[], noCm6Op: [] as string[],
    opsWithoutKinds: [...lang.ops].filter(([, d]) => !d.kinds.length).map(([n]) => n),
    opsNotInHeader: [...lang.ops.keys()].filter(n => !named(language.has(n) ? shared : own, n)),
    evalUse: readdirSync(dir).filter(f => f.endsWith(".ts") && /\beval\s*\(|\bFunction\s*\(/.test(readFileSync(join(dir, f), "utf8"))),
    thrown: {} as Record<string, string>, ops: [] as any[]}
  const byOp = new Map<string, {fixtures: number, behaviors: Set<string>}>()
  for (const fx of fixtures(crate, chunk)) {
    rep.fixtures++
    const limit = fx.output && typeof fx.output == "object" && Object.keys(fx.output).length == 1 && typeof fx.output.timeout == "number" ? fx.output.timeout : null
    let one: One
    if (limit == null) one = replayOne(lang, fx.input)
    else {
      const r = runIsolated(fileURLToPath(import.meta.url), JSON.stringify({crate, chunk, id: fx.id}), limit)
      one = "timeout" in r ? {output: r, unread: [], ran: [], thrownAt: null} : r
    }
    if (JSON.stringify(one.output) != JSON.stringify(fx.output)) rep.differ.push(fx.id)
    if (one.thrownAt != null) rep.thrown[fx.id] = one.thrownAt
    for (const p of one.unread) rep.unread[p] = (rep.unread[p] ?? 0) + 1
    if (one.unread.length) rep.unreadFixtures++
    const inp = fx.input && typeof fx.input == "object" ? fx.input : {}
    if (lang.descriptive.some(k => k in inp && jsText(k, inp[k]))) rep.descriptiveText.push(fx.id)
    if (Array.isArray(inp.steps) && literalLeaf(inp.out)) rep.literalOut.push(fx.id)
    if (limit == null && !one.ran.some(n => lang.ops.get(n)!.kinds.some(k => k == "api" || k == "internal"))) rep.noCm6Op.push(fx.id)
    for (const n of one.ran) {
      let e = byOp.get(n); if (!e) byOp.set(n, e = {fixtures: 0, behaviors: new Set()})
      e.fixtures++; for (const b of fx.behaviors) e.behaviors.add(b)
    }
  }
  rep.ops = [...byOp].sort(([a], [b]) => a < b ? -1 : 1).map(([op, e]) => ({op, kinds: lang.ops.get(op)!.kinds, fixtures: e.fixtures, behaviors: [...e.behaviors].sort()}))
  return rep
}

/** With --ran: {chunk, kinds: {op: kinds}, ran: {fixture id: [ops]}, thrown: {fixture id: site}}, for tools/spec_facts.py. */
async function ranReport(crate: string, chunk: string) {
  const file = interpPath(crate, chunk)
  const lang: Language | undefined = existsSync(file) ? (await import(pathToFileURL(file).href)).lang : undefined
  if (!(lang instanceof Language)) return {chunk, error: "no interpreter in the language"}
  const ran: Record<string, string[]> = {}, thrown: Record<string, string> = {}
  for (const fx of fixtures(crate, chunk)) {
    const timeout = fx.output && typeof fx.output == "object" && Object.keys(fx.output).length == 1 && typeof fx.output.timeout == "number"
    const one = timeout ? null : replayOne(lang, fx.input)
    ran[fx.id] = one ? one.ran : []
    if (one && one.thrownAt != null) thrown[fx.id] = one.thrownAt
  }
  return {chunk, kinds: Object.fromEntries([...lang.ops].map(([n, d]) => [n, d.kinds])), ran, thrown}
}

/** A value as a trace line shows it: a primitive, an array or a plain object as `encode` writes it (members shown
 * the same way); an instance of a class as {"cm6": "<constructor name>"}, since the two sides hold different objects
 * there and only the program-visible values can be compared; below 8 levels, "...". */
function shown(v: any, depth = 0): any {
  if (v === null || typeof v != "object") return encode(v)
  if (depth > 8) return "..."
  if (Array.isArray(v)) return Array.from(v, x => shown(x, depth + 1))
  const proto = Object.getPrototypeOf(v)
  if (proto === Object.prototype || proto === null) return Object.fromEntries(Object.keys(v).map(k => [k, shown(v[k], depth + 1)]))
  return {cm6: v.constructor?.name ?? "object"}
}

/** With --trace: one JSON line per op the fixture's program evaluated on cm6, in the order the evaluations began:
 *   {n, depth, op, kinds, value}   or   {n, depth, op, kinds, threw: {name, message}}
 * n counts evaluations from 0, depth is the nesting of ops, value is the op's result as `shown` writes it. A last line
 * {output, recorded, equal} gives the run's output and the recorded one. A crate's replayer prints the same lines for
 * the same fixture (the crate's plan says how); the first line that differs is where the two runs part. An op of kind
 * `harness` only touches no cm6 value, so a difference that begins at one is the replayer's; one that begins at any
 * other op is in that op's part of the replayer or in the crate's code. */
async function traceOne(crate: string, chunk: string, id: string) {
  // the chunk name `lang` is the language's own cases (tools/cm6/lang-cases.jsonl), which no crate owns
  const own = chunk == "lang"
  const lang: Language = own ? new Language("lang", ["note"]) : (await import(pathToFileURL(interpPath(crate, chunk)).href)).lang
  const all = own ? readFileSync(fileURLToPath(import.meta.url).replace(/replay\.ts$/, "lang-cases.jsonl"), "utf8").split("\n").filter(l => l.trim()).map(l => JSON.parse(l)) : fixtures(crate, chunk)
  const fx = all.find(f => f.id == id)
  if (!fx) throw new Error(`no fixture ${id} in chunk ${chunk}`)
  const lines: any[] = []
  let depth = 0
  for (const [op, def] of lang.ops) {
    const run = def.run
    def.run = (a, p) => {
      const line: any = {n: lines.length, depth, op, kinds: def.kinds}
      lines.push(line); depth++
      try { const v = run(a, p); line.value = shown(v); return v }
      catch (e: any) { line.threw = {name: e?.name ?? "Error", message: String(e?.message ?? e)}; throw e }
      finally { depth-- }
    }
  }
  const output = lang.run(fx.input)
  for (const l of lines) process.stdout.write(JSON.stringify(l) + "\n")
  process.stdout.write(JSON.stringify({output, recorded: fx.output, equal: JSON.stringify(output) == JSON.stringify(fx.output)}) + "\n")
}

const arg = process.argv[2] ?? ""
if (arg.startsWith("{")) {
  // The child of runIsolated: one fixture that may not terminate. The interpreter is loaded before the watchdog runs.
  const {crate, chunk, id} = JSON.parse(arg)
  import(pathToFileURL(interpPath(crate, chunk)).href).then(m =>
    isolatedMain(() => replayOne(m.lang, fixtures(crate, chunk).find(f => f.id == id).input)))
} else if (process.argv[3] == "--trace") {
  traceOne(arg, process.argv[4], process.argv[5]).catch(e => { console.error(String(e?.stack ?? e)); process.exit(1) })
} else {
  (async () => {
    const perFixture = process.argv[3] == "--ran"
    for (const chunk of process.argv.slice(perFixture ? 4 : 3)) {
      let rep: any
      try { rep = perFixture ? await ranReport(arg, chunk) : await chunkReport(arg, chunk) } catch (e: any) { rep = {chunk, error: String(e?.stack ?? e).slice(0, 600)} }
      process.stdout.write(JSON.stringify(rep) + "\n")
    }
  })()
}
