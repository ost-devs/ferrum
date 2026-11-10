// Shared helpers for cm6 probes and generators (docs/workflow/specification.md §5).
// Imported as "@harness/lib" (mapped by tools/cm6/setup_harness.py). Keep it small and stable: every audit uses it.
import {writeFileSync, appendFileSync} from "node:fs"
import {spawnSync} from "node:child_process"
import {Worker} from "node:worker_threads"

/** Seeded PRNG (mulberry32). Record the seed in the generator header and in every fixture. */
export function rng(seed: number) {
  let a = seed >>> 0
  const next = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  return {next, int: (n: number) => Math.floor(next() * n), pick: <T>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)], chance: (p: number) => next() < p}
}

/** Strings that Rust can hold: lone surrogates become {utf16: [code units]} (docs/workflow/specification.md §5). */
export function encodeStr(s: string): string | {utf16: number[]} {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c >= 0xD800 && c <= 0xDBFF) { const d = s.charCodeAt(i + 1); if (d >= 0xDC00 && d <= 0xDFFF) { i++; continue } }
    if (c >= 0xD800 && c <= 0xDFFF) return {utf16: Array.from({length: s.length}, (_, j) => s.charCodeAt(j))}  // every code unit, not code points
  }
  return s
}

/** Deep-encode every string of a value with encodeStr. */
export function encode(v: any): any {
  if (typeof v === "string") return encodeStr(v)
  if (Array.isArray(v)) return v.map(encode)
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encode(x)]))
  return v
}

/** Run f and record either its result or the thrown error as the output (exceptions are outputs). */
export function capture<T>(f: () => T): {ok: any} | {error: {name: string, message: string}} {
  try { return {ok: encode(f())} } catch (e: any) { return {error: {name: e?.name ?? "Error", message: String(e?.message ?? e)}} }
}

/** Append fixtures as JSON Lines: {id, item_id, behaviors, input, output, encoding}. */
export function fixtureWriter(path: string, fresh = true) {
  if (fresh) writeFileSync(path, "")
  let n = 0
  return (item_id: string, behaviors: string[], input: any, output: any, id?: string) => {
    n++; appendFileSync(path, JSON.stringify({id: id ?? `F${String(n).padStart(4, "0")}`, item_id, behaviors, input: encode(input), output, encoding: "utf16"}) + "\n")
  }
}

const KILL_AFTER_ENV = "HARNESS_KILL_AFTER_MS"

/** Run a probe on an input on which cm6 may not terminate (an infinite loop in synchronous code), in a child process
 * with a time limit. `script` is a .ts file that calls `isolatedMain`; `arg` is passed as its first argument.
 * Returns the JSON the child printed, or {timeout: ms} when it was cut off; throws when the child fails otherwise.
 * The child is one `node` process with this process's loader flags (no npx or tsx wrapper processes, which a timeout
 * would leave running as orphans), killed with SIGKILL at `ms`; it also kills itself shortly after (isolatedMain),
 * so it cannot outlive a parent that is killed first. */
export function runIsolated(script: string, arg: string, ms: number): any {
  const r = spawnSync(process.execPath, [...process.execArgv, script, arg], {
    timeout: ms, killSignal: "SIGKILL", encoding: "utf8", maxBuffer: 64 << 20,
    env: {...process.env, [KILL_AFTER_ENV]: String(ms + 2000)},
  })
  if ((r.error as any)?.code == "ETIMEDOUT") return {timeout: ms}
  if (r.error || r.status !== 0) throw new Error(`runIsolated ${script} ${arg}: ${r.error ?? `exit ${r.status} ${r.signal ?? ""}`}\n${r.stderr}`)
  return JSON.parse(r.stdout)
}

/** Entry point of a script run by runIsolated: arms a watchdog on its own thread (it fires while the main thread is
 * stuck in a loop) that kills the process at the parent's limit, then prints JSON.stringify(f(argv[2])). */
export function isolatedMain(f: (arg: string) => any) {
  const ms = Number(process.env[KILL_AFTER_ENV] ?? 60000)
  new Worker(`setTimeout(() => process.kill(process.pid, "SIGKILL"), ${ms})`, {eval: true}).unref()
  process.stdout.write(JSON.stringify(f(process.argv[2])) + "\n")
  process.exit(0)
}
