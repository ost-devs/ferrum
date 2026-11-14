# How the method evolved, and how to evolve it

For the orchestrator and the consultant: the agents that change how Ferrum's work runs (`docs/workflow/README.md` §7). It is a training text, not a history. It shows, on what was measured here, how a friction was recognized and what replaced it, so that the next friction is recognized sooner and answered with the right kind of change. The maintainer's intent behind it: `docs/foundation/maintainer-intent.md` "How it is reached" ("Each kind of work goes to what does it best", "The work improves itself").

Read it at the start of a stage, at a review of the method, when a stop-loss fires, and before writing a card for a step no crate has run yet. The evidence is elsewhere and is not repeated: observations in `docs/workflow/learnings.md` (`W<n>`), decisions with their alternatives in `docs/decisions/method.md` and `docs/decisions/<crate>.md`, costs and expectations in `python3 tools/ledger.py report` (`E<n>`). The tools named here: `tools/README.md`.

<!-- refs:planned tools/impl_check.py -->
## 1. The levels so far

A level is named by what does the work and by how an error is found. Each was left because of a measurement, not because a better idea existed.

| Level | What does the work | How an error is found | What it cost or missed | What moved the work on |
|---|---|---|---|---|
| 0. A method written before running | documents, revised five times in three days | by the next revision | code and claims that proved nothing (W1 to W13) | starting again from what cm6 gives when it is run |
| 1. Agents read and write everything | an agent reads cm6 and writes rows, fixtures and the scripts it needs; inputs are recorded as text for a reader | by another agent reading the same thing | five dialects of fixture, four encodings of `undefined` (W17); each fresh context rewrote the same scripts (W35) | counting: who made the defects a later step found (22 of 29 came from one step, W47) |
| 2. Agents check agents | a sample is read by a fresh agent, fixed by another, sampled again | by the sample, until one comes back clean | six rounds, 7.66 million tokens, more than the 3.65 million of all the work it checked, and it never came back clean (W33, W42) | noticing that in six rounds no value produced by a run was ever wrong: the defects were in what agents had typed |
| 3. A tool checks what is determined | `tools/spec_check.py` regenerates and compares every fixture and measures cm6's coverage; `tools/ledger.py` holds the costs; `tools/check_refs.py` the references | by the tool, for every case, in 84 seconds and no tokens (W45) | the tool could not read 3,015 of 4,950 inputs: they were JavaScript text | making the data something a program can run |
| 4. Data is a program | every fixture input is a program of one language (`tools/cm6/program.ts`), run by an interpreter per chunk; the check replays all of them and records every key read | by replay: an input that was not the input run cannot exist, a key nothing reads fails | each chunk's ops are still code a person must read to bind them in Rust; marks written as prose had to be read afterwards (W49) | asking, of each remaining agent step, which part of it is determined |
| 5. The proof is a program, and tools check tools and agents | one replayer is the proof; it is planned around its false passes (a control run, an approved file of what it leaves out); the language has cases recorded from a run; a tool names where a failing fixture first differs; one tool holds every check of a step; every change carries an expectation that is settled later | by a run, or by a tool that has been seen to fail | to be measured in the implementation of `ferrum-state` (E15, E18 to E20) | |

What a next level would be is not known and is not designed here. Candidates the evidence points at: an op that declares its positions so that a tool checks them during replay (E16); a step's card produced from the plan's data. Each is taken up when a measurement asks for it.

## 2. Milestones: before, after, why

Each line is one change, with the measurement that caused it. "Expected" marks a change whose own measurement has not come in.

| What | Before | After | Why, as measured | Where |
|---|---|---|---|---|
| Expected values | read from cm6's source and typed | written by running cm6; re-running reproduces them byte for byte | running found defects reading did not (W1); no run-produced value was wrong in six samples (W33) | `docs/workflow/README.md` §1 |
| Fixture inputs | a call as JavaScript text beside the run (`expr`, `call`, `code`), in 3,015 of 4,950 fixtures | a program the generator executes; the output is what that program gave | about 1,700 recorded inputs were corrected by hand, every one in the chunks that used text and none in the chunk that used data (W39) | `docs/decisions/ferrum-state.md`, "One encoding…", "Step A after the pilot"; E1, E8 |
| The fixture vocabulary | one dialect per chunk | one language, and per chunk only the ops that call cm6, each with the kinds of what it observes | a replayer and a check would each have read five dialects; the pilot chunk showed the shape before the other four were written | `tools/cm6/program.ts`; E7 |
| Is a recorded input complete? | a list of the keys that may hold text | replay with read tracking: a key nothing read is a failure | a list is a second description that goes stale; the run is the fact | `tools/cm6/replay.ts` |
| Verification of rows | sample, fix, sample again until clean | a tool for what is determined, one independent reading of every item, one sample as a measurement | the loop cost four times the audit and did not converge (W33); a clean sample of 28 says little (W42) | `docs/decisions/method.md`, 2026-11-13; E2 |
| Deterministic checks | each verifier and fix worker scripted them again | one tool, run by the orchestrator | W35; the tool also gave a fact no agent had produced, coverage (W41, W45) | `tools/spec_check.py` |
| A repeated judgment | an agent settled the same coverage artifact 13 times inside a step of 223,199 tokens | about 40 lines recognize it from V8's ranges and the source maps, and print how many were dropped | the artifact is a fact about the build, the same in every file of every crate (W48) | M20, E13 |
| Where cm6 threw | 26 sites annotated by hand in outputs | 355 uncaught throws tied to `raw/throws.jsonl` by the check, and nothing about cm6's source in an output | the hand annotation was partial and put a line number into what Ferrum must compare | `docs/decisions/ferrum-state.md` Q59; E11 |
| Which fixtures a deviation changes | found by reading: 1 | the deviation written into the harness copy of cm6, everything replayed: 170, in two minutes | the list is computable, and reading it was both dear and wrong | `docs/decisions/ferrum-state.md`, "S5, second part"; E12 |
| Which numbers are positions | a mark `(pos)` in prose, without the text it is measured on, read afterwards for 272,809 tokens, with 32 numbers found unmarked | a row per op, written by the op's author with the op | the author knows it at no cost; a later reader recovers it at a high one (W49) | `docs/workflow/specification.md` §4; E16 |
| One test per behavior | 627 of 799 test rows restated a fixture and went stale | a behavior is covered by the replay of its fixtures; a written test only where no run can show it | a copy of data is not a check of it (W40) | `docs/workflow/implementation.md` §2; E5 |
| Shared ops | about twenty harness ops registered by two or more chunks | one implementation each in the language, accepted when it replays every fixture of every chunk that used the name | sameness was provable by a run, so nobody had to compare code | `docs/decisions/method.md`, end of the specification stage; E14 |
| What the work cost | prose in the progress file, 35 KB loaded by every session | rows in a ledger, a report, expectations with an outcome | the question "which step made the defects" had no answer before (W47) | `tools/ledger.py` |
| The replayer's language (expected) | to be tested on literals its author types | 47 cases recorded from a run of `program.ts`, which the evaluator must reproduce before any op of a chunk exists | the evaluator is the one part of the proof no fixture checks in isolation | `tools/cm6/lang-cases.ts`; E18 |
| A failing fixture (expected) | the implementer and the test-writer each reason about whose error it is | `tools/trace_diff.py` names the first evaluation at which cm6 and Ferrum differ, and whether that op touches the crate at all | the unbounded cost of level 2 was agents disagreeing about what a tool could compute | E19 |
| The checks of a step (expected) | commands the orchestrator composes each time | `tools/impl_check.py`, run by the worker on its own output before it reports | steps whose worker could run the whole check passed at the first merge and stayed within 1.5 times their budget (E7) | `docs/parity/ferrum-state/plan.md` "Implementation"; E20 |

## 3. How to see a friction

Look in the ledger and the reports for these; each has occurred here.

- **The same thing settled more than once**: a script two workers wrote, a class an agent decided 13 times, a fix that the next sample finds incomplete (W27, W34). Repetition means the answer is determined by something; find what.
- **A loop of check and fix that does not converge**, or converges on prose while the values never change (W33). The check is measuring the wrong thing, or the producer has no way to run it itself.
- **A reader recovering what a writer knew**: marks read afterwards (W49), an order of generators kept as prose (W45), a list of fixtures written from memory (W30). The fact was free when it was produced.
- **Two descriptions of one thing**: a list of keys beside the code that reads them, a derived row beside its fixture (W40), the same rule in two documents (W8). One of them is wrong already or will be.
- **A step over budget whose output could be derived**, and a step whose cost per item is far above its neighbours' (step A: 109 to 446 tokens per fixture across chunks).
- **A disagreement between agents about a fact**. Facts are run or looked up, not argued.

A friction is written when it is seen (`docs/workflow/learnings.md`, a question in `docs/workflow/questions.md`), with its number. Without the number it cannot be weighed against what a change costs.

## 4. What kind of change answers it

Ask in this order. The first question is the one most often skipped.

1. **What is the step for?** Which error does it show, or which artifact does it give, to whom? A step nobody's result depends on is removed, not automated (the derived test rows were deleted, not generated).
2. **Is its answer determined by data that exist?** Counting, comparing, joining rows, regenerating, running a recorded case, listing what changed, checking that every member of one file has its counterpart in another. Then it is a tool, for every case, and an agent never does it again.
3. **Would it be determined if the producer wrote a fact instead of prose?** Then change what the producer writes (a row, a declared kind, a program) and the answer to question 2 becomes yes. This is where the largest gains were: inputs as programs, positions as rows. Moving structure to the moment the fact is known is cheaper than any tool that reads prose afterwards.
4. **Are there many instances of one shape, read by more than one program?** Then a small language and an interpreter. It was right for fixtures because all of these held: thousands of instances; two readers that must agree (cm6's side and Ferrum's); every instance provable by running it; a vocabulary that a pilot chunk had shown before the rest was written. It is wrong when the instances are few, when one program reads them, or when the vocabulary is still being discovered: a language fixed too early is a second thing to keep right. Keep it small, in one file, documented at its top, with cases of its own recorded from a run.
5. **Does it need a choice no data dictates?** Enumerating what a function does from its source; turning a call on one API into a call on another; a design; a reason; the class and severity of a finding; any decision. This is an agent's, at the effort its silent errors ask for (`docs/workflow/README.md` §5 "Effort"). Then ask what a tool can still do around it: produce the base the agent starts from, and check whatever of the agent's output is determined.

Most steps end as a mixture, and the mixtures that worked here are few:
- *an agent writes a program, a tool proves it*: the interpreters, accepted when replay reproduced every fixture; the worker runs the check itself, so the merge is clean;
- *a tool lists, an agent gives the reason*: coverage names 13 unreached sites, a worker says why each cannot be reached;
- *a tool computes, the consultant decides*: the fixtures a deviation changes; what the replayer leaves out, approved by reason;
- *an agent writes the tool once, the tool runs for every crate*: every file of `tools/`.

For the practical question "should this be generated?": generate from a declaration, never from code or prose. The 255 ops that bind fixtures to Ferrum's API are not generated, because an op is code in an interpreter and its Rust form needs the crate's signatures and the text of each position; the registry of those ops is checked by a tool against `raw/fixture-ops.jsonl`, because that is a join of two lists.

## 5. Building the tool, the language or the check

- **Try it on the real data before designing around it.** Every tool here was prototyped first, and the prototype changed the design each time: the broad form of a check had false positives (Q58); a patch tried on the existing replay showed 126 of 3,823 fixtures changing, in one chunk; the trace was run on real fixtures before the plan relied on it.
- **A check must be seen to fail.** A tool that reports zero proves nothing until a defect made on purpose is reported: the control run of the replayer, the sensitivity check of the oracle, one seeded defect per check of `tools/impl_check.py`.
- **Print what was dropped or accepted.** A tool that ignores something says how many (the 13 dropped artifacts; "now wrapped in ok"). A silent exception is a hole.
- **Expected values of a tool come from a run too.** The language cases are outputs of `program.ts`, not literals.
- **Do not turn a judgment into a hand-written list.** A list of known artifact lines per file, a list of fixtures to skip, a predicate that describes an improvement's domain: each is a second description that goes stale, and each lost to a computation (`docs/decisions/method.md`, the entries of 2026-11-13 and 2026-11-14).
- **A check on a file one role writes must not stop another role.** Count it, and require zero where that role approves.
- **Let the producer run the check.** Budgets held and merges were clean where the worker could run the whole check on its own output; they were not where only a later agent could see the error.
- **Remove what the change replaces**, in the same commit: the old step, its text, its tool.
- **Say what will confirm it** (`python3 tools/ledger.py add expect …`) and settle it at the point named. A change its measurement refutes is undone.
- **Weigh it.** A tool pays when the tokens per instance times the instances still to come, in this crate and the next three, exceed the cost of writing and proving it; or, whatever the count, when the error it removes is one nobody would see. It does not pay for a step that occurs once, and it is never a way to check less.

## 6. What stays an agent's, and why that is not a defect of the method

Tokens are well spent where they buy something no program gives: reading cm6's code for what it does and why; porting an algorithm to another language's means; deciding; reviewing a result against its purpose; noticing that a question was framed wrongly. The specification's defects of substance (13 of 29) were found by reading, and coverage cannot find an input class missing on a line that runs (W41, W42). The aim is not fewer agents. It is that no agent spends its reasoning on what a run already knows, and that every agent's output meets a check as early as one can exist.

## 7. Keeping this document

The consultant adds a milestone at an end-of-stage review, when its measurement exists, and moves an "expected" line to its measured form or removes it with the change. A level is added only when what does the work, or how an error is found, has changed in kind. Nothing here binds a step: the binding text of every change is where its decision record says.
