# Decisions: method

Decisions about the method: how the work is specified, implemented, checked, decided and recorded (`docs/workflow/`). Each entry holds the question, the decision, the reasons, the alternatives that lost, the confidence and what would reopen it; the binding text itself is where the entry says (`docs/decisions/README.md`). Oldest first; a decision that replaces an earlier one says so, and the earlier entry stays.

## 2026-11-08 · producers bring facts and questions; the consultant derives decisions

*decided by consultant, confirmed by maintainer; recorded in commit `5b074d1`.*

Questions (raised by the maintainer, 2026-11-08):
1. Do the options attached to every question make the consultant a chooser
   instead of a decider?
2. Why does the orchestrator propose the dispositions (and the sketch) for
   the consultant to approve?
3. Should agent-loaded files keep pointing at branch bad-start once the
   workflow is built from it?
4. Where does the instruction for raising questions live?

Decisions:
1. A question carries what was found, why it is open, the facts and
   consequences that bear on it, what it blocks and who raised it; no options,
   no recommendation. The shape lives in the new CLAUDE.md, which every
   session and subagent loads, since every one of them may raise a question;
   docs/workflow/README.md §3, the spec-auditor card and the orchestrator
   skill point to it. Researchers report several possibilities as facts with
   consequences and never recommend one.
2. Producers (the orchestrator, workers, researchers) never propose an
   answer. S1 gathers the facts of every inventory row (does, platform,
   used_by) and the consultant derives the dispositions, checking the premise
   of every DROP against cm6. The crate's design (implementation-plan.md,
   including contract traits and fakes) is written by the consultant at S5
   from the facts in contracts.md, hazards.md (now with per-throw facts) and
   stack.md. The JS->Rust idiom table keeps only what must hold, not a
   "usual Rust shape" menu. Method changes reach the consultant as learnings
   that call the method into question, not as suggested changes.
3. A prohibition is written only for what an agent would plausibly do in its
   task (new .claude/rules/writing.md "Agent-loaded files" 3). bad-start is
   removed from rules, agent definitions, skills, workflow briefs, tools and
   ferrum-foundation.md §5; docs/foundation/bad-start-quarry.md is deleted
   (its own text said the workflow had taken what held). Kept: the evidence
   citations in docs/workflow/learnings.md (a record, not an instruction) and
   the ferrum-state completeness cross-check in specification.md §1/§8, read
   by the verifier only after the rows exist and ending when the ferrum-state
   specification is approved.
4. Open questions Q1-Q3 are to be rewritten in the new shape (progress file).

Reasons:
- Anchoring: a menu frames the problem and its premises; approving a ready
  answer is weaker than deriving one, and a wrong DROP passes conformance
  silently. Example found: Q4's three options all assumed the reference is a
  commit of main; none asked about published releases, which turned out to
  matter (b9f1dbe).
- What the raiser holds that the consultant cannot cheaply rebuild is the
  facts it read, which the new shape keeps ("Bears on it"); the alternatives
  the consultant builds itself, and every decision commit already lists them.
- Evidence the consultant does not need menus: Q3 came without options and
  three independent consultant runs raised it (2026-11-07 test).
- Naming a branch an agent would never meet points it there.

Alternatives and why they lost:
- Keep options, add "consider options beyond these": the frame stays.
- Options in a separate field read after deciding: an agent reads the whole
  file at once.
- Orchestrator keeps proposing dispositions, consultant samples: sampling is
  weaker on exactly the hidden-error class (DROP).
- Remove the bad-start cross-check too: loses a net against forgotten cm6
  behaviors, at the cost of one mention read after the fact; kept with the
  maintainer's agreement.

Confidence: high. Reopen if questions without options arrive ambiguous enough
that the wrong problem gets decided, or if the consultant's context cannot
hold the S1 facts of a large package (measure on ferrum-view).

The intent bullet and the consultant definition were changed with the
maintainer's approval in a consultant session, 2026-11-08.

## 2026-11-08 · dev/ptbr is closed to agents and kept current by a translator agent

*decided by consultant; recorded in commit `4483420`.*

Question (maintainer, 2026-11-08): translations in dev/ptbr/ are for human
readers only; no work should read them, and they should update themselves,
including new documents, with a Sonnet agent.

Decision:
- Mechanism, not only text: .claude/settings.json denies Read and Edit on
  /dev/ptbr/**. Per the Claude Code docs (permissions.md, settings-reference.md)
  this hides the files from Grep/Glob results and blocks Read, Edit and the
  Bash file commands it recognizes, for every session and subagent. One line in
  CLAUDE.md covers what the deny cannot see (a bare `grep -r .` in Bash).
- A SessionStart hook runs .claude/hooks/ptbr_sync.py: without AI it compares
  each translation's header commit with its original's history; if anything is
  missing, stale or orphaned it starts, detached, `claude -p --agent translator
  --model sonnet --setting-sources user` (the agent definition passed inline
  with --agents, since that flag also hides project agents). Leaving out
  project settings lifts the
  deny for the translator alone and keeps the hook from recursing. The agent
  translates only the diff (whole file when new) from the committed original;
  the script verifies headers, regenerates the index table and commits only the
  translation paths. A lock file prevents parallel runs.
- Scope (the maintainer asked for every new document too): every tracked .md
  plus .claude/settings.json, except mirrors/, dev/, docs/progress/,
  docs/parity/ (work state), crates/*/src/README.md (changes with code), code,
  and legal texts (LICENSE-*, THIRD-PARTY-NOTICES.md: a translation has no
  legal force).
- writing.md no longer says translations are updated only when asked.

Alternatives: text-only instruction (lost: agents meet the files in every
search, as observed in this session); a PreToolUse hook exempting the
translator by agent_type (lost: cannot filter a repo-wide Grep's results,
which the deny does); the model committing (lost: a script commits
deterministically with explicit paths).

Confidence: high on the deny (documented behavior); medium on the background
run until observed in use. Reopen if the translator misses files or the deny
leaks translations into search results.

## 2026-11-08 · crate src/README.md files are translated too

*decided by maintainer; recorded in commit `2ff4f30`.*

Question (maintainer, 2026-11-08): the automatic translation scope left out
crates/*/src/README.md because they change with every code change.
The maintainer's criterion is relevance to a Brazilian developer reading
Ferrum, not change frequency. These files are the living list of what each
crate contains, item by item, which such a reader needs; frequent changes cost
little (diff-only Sonnet runs). They are now included.

Kept out under the same criterion: docs/progress/ and docs/parity/ (work state
and specification data written for agents), mirrors/, code, legal texts.
Reopen if the maintainer finds those relevant to readers.

dev/ptbr/README.md still lists the old exclusion; agents are denied that
folder, so the maintainer edits that line.

## 2026-11-08 · the translator agent runs at medium effort

*decided by consultant, confirmed by maintainer; recorded in commit `9e9849e`.*

Maintainer's question, 2026-11-08: should the translator's effort be set so
it spends no more than needed (medium)?
Yes: the default is not guaranteed. The alias 'sonnet' may resolve to a model
whose default is high (Claude Code docs, model-config.md: only the 5.5 models
default to medium), and a level saved in user settings could raise it.
Translating short diffs under fixed form rules needs no deeper reasoning, so
more effort only spends quota. Set where each launch path reads it: the
frontmatter (effort: medium), the inline --agents definition and --effort on
the claude -p call, and CLAUDE_CODE_EFFORT_LEVEL=medium in its environment,
which outranks every other source.

Confidence: high. Reopen if translations show errors that more effort fixes.

## 2026-11-09 · method review before the first run

*decided by consultant, confirmed by maintainer; recorded in commit `a3b36a9`.*

Questions (the maintainer's review of 2026-11-09, plus what the review found):
1. Agents and documents name "the consultant" without saying it is the
   `consultant` agent.
2. With the consultant writing the crate's design, where does a design
   choice with an observable difference go, what must an error contract
   say, and what happens to a native opportunity with an observable impact?
   Should producers get the consultant's analysis to gather better facts?
3. Does the orchestrator know it must repin the mirrors per the published-
   release decision (b9f1dbe), and do documents still say "the commit
   pinned"?
4. Is a fixed card size (about 120 lines) the right limit?
5. What makes "each agent gets what it needs, no less, no more" observable,
   while the orchestrator keeps a broad view?
7. The open D1-D9 entries of ferrum-foundation.md §6 carried recommendations
   and option menus; §4.2 carried preliminary dispositions for view.
8. Who follows the test rules, and what of unit tests inside src/?
9. The Claude Code documentation mirror is refreshed but nothing points to
   it; nobody re-checks README §8 when Claude Code changes.
10. Running the next crate's S1 during this crate's S2-S5, and the next
    crate's specification during this crate's implementation.

Decisions:
1. CLAUDE.md, ferrum-foundation.md §6 and the intent (clarification approved
   by the maintainer) name the `consultant` agent and its definition.
2. specification.md §7: a design choice that changes observable behavior or
   public API is a deviation, recorded in the item's row or in decisions.md
   (citeable), pointed to by the plan, drafted for the maintainer if it is a
   first iteration of D1-D10; an error contract states what a Rust caller
   observes where cm6 throws and how a test checks it; a native opportunity
   with an observable impact is such a deviation. No separate analysis skill
   for producers: CLAUDE.md "Bears on it" now asks for the facts the
   consultant reasons from (why cm6 does it, with evidence; what is
   observable; who depends, with the values they pass). README §3: Rust
   design is a decision when visible outside a module; private choices that
   change nothing observable are the implementer's (also rust-crates.md
   Code 8).
3. specification.md S0 gives the commands (npm view, /mirrors pin), the
   dependency re-resolution (mirrors.md "Dependency pins") and the commit;
   §1 names the release instead of "the commit pinned". The consultant
   cannot write mirrors/ (hook), so the repin is S0's.
4. The card limit becomes a criterion: what the worker needs to do its
   assignment without the briefs, nothing it cannot act on.
5. Every card-run worker reports what it looked up outside its card and
   what it did not use (CLAUDE.md "Reporting from a card"); the orchestrator
   records both and the retrospective turns them into card changes (README
   §5, §7). The orchestrator reads ferrum-foundation.md §1-§2 at start
   (ferrum-run), for the purpose behind the facts it gathers.
7. Open D entries state the question and preliminary facts only; §4.2 for
   view says what each file holds, not its disposition; "tree-sitter is the
   stated choice" became "the backend considered so far".
8. Test rules stay in rust-crates.md, which loads for everyone touching
   crates/. Unit tests in src/ never carry `// covers:`; a behavior is
   covered only in crates/<crate>/tests/ (rule, implementation.md §3 step 4,
   conformance G2). The duplicate line in implementation.md §5 is removed.
9. CLAUDE.md "Outside sources": mirrored sources are read in mirrors/, not
   on the web. README §8: at each stage start the orchestrator compares
   `claude --version` with the verified version and re-verifies the
   constraints against the mirror when it differs. No dedicated agent.
10. One crate and one stage at a time (README §1; the S1 overlap sentence
    removed from specification.md §9). A capability later found missing in
    a conforming crate goes through that crate's stages again.
Also: learnings.md pointed to the deleted bad-start-quarry.md; the consultant
definition's description is aligned with confirmed decisions (approved);
a check_refs gap with pages mirrors is noted in the progress file.

Reasons:
- 2: the consultant decides, but a deviation must stay citeable by
  annotations and visible to conformance (G1, G6); burying it in a plan
  would make it silent. Facts in CLAUDE.md reach every producer from one
  place; a separate skill would duplicate it and pull producers toward
  judging.
- 4/5: a line count is a proxy that can cut what a worker needs; the
  reports measure the real gap from both sides.
- 7: the recommendations anchored the consultant on exactly the decisions
  of highest impact; facts were kept, labeled preliminary.
- 9: the mirror is local and current; a version trigger makes README §8
  stay true without a new agent to maintain.
- 10: overlapping stages run the later one with an unrefined method, need
  two consultants' worth of decisions at once, and complicate the release
  pins; the maintainer weighs correctness over speed.

Alternatives and why they lost:
- 2.1 analysis skill for producers: duplicates CLAUDE.md, invites
  pre-decided framing.
- 9 dedicated claude-code-researcher agent: occasional need; Explore over the
  mirror serves it. Reopen if Claude Code questions recur.
- 10 keep the overlap: faster, but each overlap is a stage run with a
  method not yet refined by the stage before.

Confidence: high on 1-5, 7, 8; medium-high on 9 and 10. Reopen 10 if waiting
between crates becomes the bottleneck and the retrospectives change little.

The maintainer confirmed two parts in a consultant session, 2026-11-09: the
clarification of the intent (decision 1) and the alignment of the consultant
definition's description. Everything else is the consultant's decision.

## 2026-11-10 · worker effort pinned at high; cost levers for larger crates (M1, M6)

*decided by consultant; recorded in commit `f46a943`.*

Question M1 (maintainer): would Opus at medium in the workers give the same
result at lower cost, quality prevailing?
Question M6 (maintainer): can the method be made more effective for larger
crates such as @codemirror/view?

M1 decision. Every worker and researcher definition sets effort: high
(translator stays medium; consultant already high). The orchestrator passes
no effort parameter. A role moves to another level only on a paired run
(same assignment at both levels, compared by a verifier against verified
rows, tokens recorded); verifier and conformance-checker stay high. The
first paired run is spec-auditor on chunk rangeset at S6, against the high
S2 output of 479aa74.

Reasons. (1) No comparison exists (W23: the two medium runs had different
tasks). (2) An auditor's miss is a hidden error: conformance compares
against the rows, so a missing behavior passes silently; W18 shows chunk
auditors at high still missed throw sites and tags. (3) The Claude Code
docs (model-config.md "Choose an effort level") place high at "work where
verification matters or edge cases are likely" and say lower levels test
fewer edge cases and verify less, which is what S2 exists to do; part of
medium's saving is plausibly fewer checks, not cheaper thinking
(deduction). (4) Unpinned workers ran at the session level, and the
maintainer's user settings set Opus 5.5 to medium, so a new session
without /effort high would have run the S4 verifier and every later worker
at medium silently; the Agent tool's per-spawn effort parameter overrides
the definition the same way. Pinning removes both silent paths.
Alternatives: medium now for all workers (rejected: no evidence, hidden
errors, quality prevails per the maintainer); medium for mechanical roles
only (rejected for now: none of the roles is mechanical enough that its
miss would show itself; the implementer is the closest and is measured at
its stage); leave inheritance (rejected: uncontrolled variable).
Confidence: high for pinning; the medium question is open by design.
Reopens: a paired run where medium misses nothing the high run found and
writes no wrong row.

M6 decision. Corrected premise: inventory.cjs on view 6.43.15 gives 332
rows (state 264); 13 of 35 files have no row (the DOM machinery and
viewstate.ts), so the 12M line-based extrapolation is not the expected
cost; S1 scales with rows (~1.1M, deduction), S2 with in-scope items and
the helpers they reach, known after view's S1 dispositions. No step that
produces or checks evidence is shortened (specification.md §10 stands).
Levers in force: one shared TypeScript-checker tool for used_by (three
chunks each wrote their own; two used grep with known misses: quality and
repetition); the progress file records what each step found in an earlier
step's output, so the retrospective can tell which steps pay for themselves
(also feeds M4). Waits for view's S0: the estimate after S1 dispositions,
and how golden values are produced for items needing an EditorView.
Assumption about the maintainer's wishes: cost is never cut by reducing
coverage or checks ("quality must prevail"); if they would accept sampling,
that would be their call. Confidence: medium-high. Reopens: per-step
finding counts showing a step that finds nothing across a crate.

## 2026-11-10 · criterion for decision tags (deps), re-applied to every behavior (M3)

*decided by consultant; recorded in commit `0cab8fb`.*

Question (M3, docs/progress/ferrum-state.md; learnings W19; verification.md
seed 4101 V5, O1): the spec-auditor card and specification.md §5 gave no
criterion for a behavior's `deps`. S2 auditors tagged D1 only where a
non-ASCII fixture showed an effect; S3 corrected 97 rows under a rule from
the orchestrator's brief ("input or result includes a document position,
length or offset"), which no decision introduced. Seed 4101 found 16 of the
92 behaviors of its 28 items missing D1 under that rule, 7 marginal, and a
missing D2. Blocks: the S4 fix step and the next crate's card.

Decision.
1. specification.md §5 item 2 "Decision tags": a tag says some answer to
   the decision changes what the behavior asserts. Tests per tag: D1 = put
   an astral character in the text the behavior reads or its inputs were
   built from; tag if an asserted number or outcome differs in UTF-8 bytes
   or chars instead of UTF-16 code units; not for numbers only carried
   without relation to text, nor for assertions about identity, order or
   emptiness. D2 = line splitting, break counting, line numbers and
   boundaries, separator reinsertion, grapheme cluster boundaries. D6 =
   observable identity, reuse, sharing, shared mutation or global state.
   D5 = command target or signature; D3/D4/D7/D8 only when the code shows.
   When unsure, tag.
2. §5 item 3: the fixtures each tag requires (astral for D1; each relevant
   separator or multi-code-point cluster for D2).
3. §8 item 1: a mechanical check that every D1/D2 behavior cites such a
   fixture; §8 item 2: the sample checks tags both ways.
4. §8 item 4: a mismatch from a rule applied to every row is fixed on every
   row the rule covers, not on the sampled rows only.
5. Appendix A: the card carries the tag tests verbatim (condensing §5 is
   how the criterion was lost).
6. For ferrum-state: all 885 behaviors are re-tagged before seed 2, one
   fresh spec-auditor per chunk, with change files, the missing fixtures
   added, Q41-Q44 scale counts recomputed (steps in the progress file M3).

Reasons. Who reads `deps`: (a) §5 item 3, which requires a non-ASCII
fixture for each tagged behavior; this is the only guard against a unit
conversion that is wrong but never exercised, an error conformance cannot
see because G4 replays only the fixtures that exist; (b) the implementation
gate (implementation.md §1), coarse in practice since D1 precedes all of
ferrum-state's code; (c) evidence for D1/D2/D6 (Q41-Q44 cite tag counts).
For (a) and (c) what matters is whether the unit changes what the behavior
asserts. A non-ASCII fixture is meaningless for numbers with no text behind
them and for identity or order assertions, and the conversion code lives
where text is measured. Measured at 6ec392d: 67 of 209 D1 rows cite no
astral fixture, 39 of 125 D2 rows none with CR or U+2028, so the coverage
rule was not enforced either; the new §8 check makes that gap visible.
Re-applying to all rows: 16 of 92 sampled behaviors is a systematic rate
(about 17%); fixing the drawn rows would leave on the order of 150 wrong
rows that a later clean seed could pass by luck. Verified: findColumn
returns UTF-16 offsets stepping by findClusterBreak (column.ts:24-32), so
findColumn.B7-B9 are D1 and B8 is D2 too; F0372 inserts "B😀" (toB 4) and
"\r\nC" (inserted text ["", "C"]), so iterChanges.B2 is D1 and D2.

Alternatives. (i) Keep the S3 rule: mechanical, but tags every behavior
whose values hold a position (identity of EditorSelection.map's result,
RangeSet.update returning the same set), demanding pointless fixtures,
inflating the D1 evidence, and its "document position" wording missed
string offsets (findColumn). (ii) Effect shown by an existing fixture (S2
practice): circular, the tag is what requires the fixture; it produced the
gap. (iii) Two D1 tags (carries positions / measures text): a schema change
for a distinction no consumer uses, since position-carrying APIs come from
signatures. (iv) Fix V5/O1 rows only: rejected above.

Confidence: high on re-applying to every row and on the mechanical fixture
check; medium-high on the tag tests. Reopen if seed 2's verifier finds tags
disputed under the tests on more than a few rows (the tests are ambiguous),
or if the D1 decision at S5 needs a per-behavior list of position carriers
that the inventory signatures do not give.

## 2026-11-10 · the D2 tag counts text the behavior reads, not numbers built from text before the call (M7)

*decided by consultant; recorded in commit `61463de`.*

Question (M7, docs/progress/ferrum-state.md): the M3 re-tag workers read
the D2 test of specification.md §5 item 2 three ways. `rangeset` tagged D2
on every position downstream of an insertion that ChangeSet.of split.
`state` tagged D2 wherever a CRLF in split text could precede an asserted
number, flagging about 40 rows as unsettled. `change` left the section walks
(mapPos, touchesRange, composeDesc) untagged. The D1 test says "or that its
inputs were built from"; the D2 test is silent. Seed 2 checks tags both ways
and blocks on one reading.

Decision. A D2 construction parallel to D1's, scoped to text the behavior
reads. That text is a string the behavior splits, measures or steps through
itself, or a document, Text or line it reads, taken as the string cm6 split
to build it. Numbers the behavior receives already measured are not D2: the
section lengths of a change set built before the call, and positions in a
selection, range set or effect mapped through one. D1 is unchanged. Passes
before seed 2 (steps in the progress file, M7):
- `rangeset` and `state` re-derive D2 blind;
- `change` re-derives every tag blind, because its M3 worker printed the
  current tags before deriving;
- rows that gain D2 get their §5 item 3 fixtures;
- `text` and `facet` need no pass, since every D2 reason there rests on
  text the row reads;
- Q42 gains a counted fact for the excluded answer.

Reasons.
- Which D2 answers reach a derived number. Only counting a break of two or
  more code units (CRLF, a configured "\r\n") as more than one position.
  LF, lone CR and U+2028 are one code unit and one position whether
  split or not. Cluster rules reach only code that steps clusters.
  ChangeSet.of measures insLen from Text.of(insert.split(...))
  (mirrors/cm6/state/src/change.ts:335-336). mapPos works on section
  numbers only (change.ts:122).
- Where a wrong implementation could hide. A Ferrum Text that keeps raw
  separators and converts positions converts where text is read. Text
  reads include a document's length and positions in it. That is why
  range checks against doc.length, sliceDoc and wordAt stay D2, and
  Facet.compute.B3 (doc length in a getter) too. A section walk reads no
  text, so a CRLF fixture there re-tests arithmetic that ChangeSet.of's own
  D2 fixtures already check.
- Why D1 keeps "built from". Its live alternative (UTF-8) re-expresses
  every position, so each fixture replay converts the expected positions
  against the right document (old or new). Astral text before them is the
  only test of that conversion. Under cm6's break counting, no conversion
  exists for D2.
- Evidence. The D2 count then shows where the line model and clusters are
  exercised, which is what the D2 decision (library and Text design) needs.
  The excluded answer stays visible as a counted fact in Q42.
- Checkability. "Does the behavior read the text, or only numbers measured
  from it?" can be checked against the code path. Two of three workers
  already drew the line close to there (state's mapped-through-prebuilt
  rows and rangeset's are the exceptions).

Alternatives.
(i) Symmetric with D1, so built-from text counts. Rejected:
- D2 would nearly coincide with D1 in `change`, `state` and `rangeset`;
- it would take passes over `change` and `state` (state itself missed
  sliceDoc.B4 and wordAt.B5 under its own reading) plus one CRLF fixture
  per derived-number row;
- those fixtures test no code path that ChangeSet.of's and Text's D2
  fixtures leave untested;
- it would blur the D2 evidence.
(ii) Narrowest: only when the behavior's own code splits, numbers lines or
steps clusters. Rejected: it drops reads of a document whose positions a
raw-separator Text would have to convert (range checks, sliceDoc), which is
where a hidden error would sit.
(iii) Keep each chunk's reading. Rejected: seed 2 mismatches would then
measure the chunk, not the rows.
(iv) Keep change's D1/D6 tags and rely on seed 2's sample to catch
anchoring. Rejected: a worker runs on that chunk anyway, and blind
derivation costs little at the margin.

Confidence: medium-high. Reopen if:
- S5's D2 weighs counting a break of two or more code units as more than
  one position: re-tag derived-number rows and add CRLF fixtures before
  implementing;
- seed 2's verifier disputes D2 tags on more than a few rows under the new
  bullet.

## 2026-11-13 · method after the ferrum-state specification (M1, M9-M11, M13-M19)

*decided by consultant; recorded in commit `b538d7d`.*

Taken in the maintainer's session with the consultant on the method
(agenda dev/maintainer/sessao-consultor-metodo.md, removed as resolved).
Evidence measured on the specification at 30d5121: learnings W39-W44.

Verification of a specification (M10, M11, M17) - specification.md §8.
Question: the S4 loop "sample until clean" did not converge (six samples,
7.86M tokens against 1.7M for S2) and every verifier rebuilt the same
scripts. Decision: (1) the deterministic checks are one tool the
orchestrator runs, cm6 coverage by the generators included; (2) a fresh
auditor enumerates the behaviors of every item once and the two lists are
matched; (3) one sample by a verifier measures the rate per severity and
is not repeated until clean; fixes are classes tested by script on every
row. Reasons: of the 29 mismatches 13 were about what cm6 does (6 missing,
7 wrong), found in seeds 1, 4 and 6 and not in 2, 3 and 5, so a clean
sample of 28 items says little; the samples read at most 168 of 261 items.
Independence found them, so it is kept and applied to every item instead
of a tenth at a time. Lost: keeping the loop with a severity stop (would
have ended at seed 2 and missed V14-V21); dropping verification because
"the defects were prose" (false: 13 of 29); coverage alone (it would have
shown none of the 6 missing behaviors: they are input classes and
cross-function effects, not untaken branches). Confidence: high on (1),
(3) and the fix rule; medium on (2), whose cost is an estimate (W43).
Reopens: ferrum-view's first chunk, if the completeness pass costs more
per high mismatch found than the ferrum-state seeds did.
The maintainer's close of S4 stands: the rates leave an expected 3-5
missing behaviors in the unsampled items, and another seed costs over 1M.

Fixture inputs and derived rows (M15, M9) - specification.md §5 item 3, §6.
The recorded input is the program the generator runs through the chunk's
interpreter; no row restates a fixture. Reasons: the chunk with an
interpreter needed 0 of about 1,700 input corrections, the others all of
them; 627 of 799 test rows repeat fixtures and 116 went stale. Lost:
a stricter wording of "the input actually used" (still checked after the
fact); keeping derived rows with generated lists (a copy nothing reads).
Confidence: high.

Effort (M1 revised, M13, M16) - README.md §5.
The level follows what shows a step's errors: medium is allowed where a
deterministic check catches every error before the merge (class fixes
tested by script, code under tests its author cannot edit); high where
omissions are silent. spec-auditor stays high at S2: what it leaves is
caught only by the costliest step. The paired run moves to ferrum-view's
S4 completeness pass and is not run on ferrum-state. Lost: all roles
high (pays for depth where a check already guards); effort by role;
lowering the auditor because verification catches its gaps (the catch
cost 4x the audit). Confidence: medium-high; the recorded tokens and
attempts of the medium steps confirm or reverse it.

Implementation brief (M14) - implementation.md, specification.md §7.
The brief keeps what parity cannot be shown without (six lines); the
procedure of each crate is a section of its plan, written by the
consultant after reading the specification, first unit as a measured
pilot. Reason: the advance brief was wrong twice for this crate (one
hand-written test per behavior; one replayer for fixtures of which 3,015
record their call as JavaScript text). Lost: keeping the module-by-module
table as a default (it frames the plan before the evidence); dropping the
brief (the independence of expected values must hold for every crate).
Confidence: high on the split; the procedure itself has no evidence yet.
conformance.md: the same sample rule replaced; coverage by replay admitted.

Recording and sessions (M18) - README.md §5, §7, ferrum-run skill, notes.md.
Progress, learnings and operating practices are written when they happen,
in the commit of the work. A session may end at any step boundary and
must at a stage boundary. Lost: a new session per step (what was lost was
what was unwritten, and forcing sessions needs the maintainer present);
transcript digests as the record (a repair, kept only as that).

Self-improvement, cards, tool limits (M19) - README.md §5 "Context", §7, §8.
Cards give the purpose of each field and the decisions in force; checkers
never get the author's reasoning. Tool limits are read in the mirror and
tried: effort per invocation exists; autoMemoryDirectory is not ignored
from repository settings in general; mirrors, harness and fixture
regeneration work in a cloud session. Lost: preloading the consultant's
whole context into workers (most of it is not actionable to them, and
the defects came from not knowing what a field is for).
The parts that are the maintainer's (the intent; where the work runs) are
drafted in dev/maintainer/drafts/intencao-e-nuvem.md and block nothing.

## 2026-11-13 · The system realigned to the result: evidence that runs, a plan per crate, a ledger, decision records, a loop that checks its own changes

*Decided by the consultant under the maintainer's instruction of 2026-11-13: review and realign everything needed to reach the result, discard what is ineffective, with nothing untouchable, the intent and the foundation included. The intent file was rewritten on that instruction. Binding text: `docs/foundation/maintainer-intent.md`, `docs/workflow/` (README and the three briefs), `.claude/agents/`, `.claude/skills/ferrum-run/`, `.claude/skills/consultant-context/`, `tools/`. It replaces, where they differ, the entries above on effort (M1), on decision tags (M3, M7) and the entry of the same day on M1, M9–M11, M13–M19, whose reasons still stand.*

**Question.** Seen from the result the maintainer wants (Ferrum giving its users what cm6 solved, with parity that is shown, reached almost without the maintainer and without debt), what must the system be, judged without regard for what exists?

**What the evidence says** (`docs/workflow/learnings.md` W33, W39–W47; `python3 tools/ledger.py report`). The specification of the first crate cost 11.4 million tokens and no line of Rust exists. 7.7 million of them went to sampling and fixing. In six samples no value produced by running cm6 was wrong; every defect was in text written beside the runs. A tool written on 2026-11-13 re-ran all 4,950 fixtures and measured cm6's coverage in 84 seconds with no agent. So: what runs is reliable and cheap to check; what is described is neither.

**Decisions.**
1. *Proof is what runs* (`README.md` §1). Fixtures as programs, ported tests, replay, fresh-seed differential runs, coverage on both sides, mutation. Prose serves agents and decisions. The table of §1 assigns each kind of error to the cheapest means that shows it.
2. *A brief holds what is true of every crate; each stage of each crate has a plan* (`docs/parity/<crate>/plan.md`), written by the consultant from the crate and the ledger, with units, checks, effort, a token budget per step and a pilot. The Rust design is `design.md`. This extends the decision on the implementation brief to all three stages.
3. *Stop-loss.* The orchestrator stops a step at 1.5 times its budget, at a third failure of a check on one unit, or at a third round of a fix loop, and calls the consultant. Nothing questioned the verification loop of `ferrum-state` for six rounds.
4. *A ledger* (`docs/progress/ledger.jsonl`, `tools/ledger.py`): each run, each defect a later step finds in an earlier step's output, each method change with the measurement that should confirm it, and its outcome. The progress file shrinks to where the work is (it had grown to 35 KB loaded into every session).
5. *The method loop* (`README.md` §7): measure, review at four fixed points without being asked, change, confirm. A change its measurement refutes is undone.
6. *Decision records are documents* (`docs/decisions/`), not commit messages. A cloud clone had 52 of 202 commits and showed 8 of 21 decisions; commit messages are not translated for the maintainer and cannot be cited or corrected. The `Decided-by` trailers are dropped; the 19 earlier decisions were moved here.
7. *Decision tags (`deps`) are dropped* for the crates that follow. Their three uses each have a cheaper means: which fixtures a behavior needs (the text classes of `specification.md` §5 item 3, whatever was decided), when an item can be implemented (all of a crate's decisions precede its implementation; a draft names what waits), evidence for a decision (its question lists the items). They cost about 1.5 million tokens of tagging passes and three of the sampled mismatches. M8 falls with them.
8. *No committed view repeats the rows* (M2): the schemas of `specification.md` §4 now name every file the stage writes; views are printed on demand.
9. *The checks that sweeps did by hand are the tool and the completeness reading* (M4): no separate sweep step at S3.
10. *Write limits* (M5, M12): a guard sees the Write and Edit tools only, so the orchestrator checks `git status --short` against the card's paths before merging; a check that the consultant's fields are unchanged is added to `tools/spec_check.py` when the next specification starts.
11. *One checking role.* `conformance-checker` did what `verifier` does (an independent reading with verdicts); the definitions are merged. Conformance gains coverage of Ferrum's code by the checks and mutation as gates, and its oracle runs on seeds the implementation never saw.
12. *Where the work runs*: the maintainer's machine or a cloud session (the three reasons for the machine alone were checked and do not hold, W44). The session-start hook fetches every mirror.
13. *Removed as ineffective*: the `consolidate` skill (recording as the work happens replaces it, and it pointed to the maintainer's auto memory); `tools/transcript_digest.py` (a repair for records not written in time); the agenda and the draft of the same day (applied).

**Alternatives and why each lost.**
- *Keep the stages as they were and only tune them*: the cost sat in verifying descriptions; tuning the sampling keeps paying for the wrong object.
- *Drop the behavior rows altogether and keep only runs*: a run does not say which case of cm6 it shows, the consultant's decisions and the completeness reading need the cases named, and `ferrum-state`'s questions cite them. The rows stay, slimmer, each tied to fixtures.
- *Decide every crate's foundational questions before its audit*: the evidence for D1, D2 and D6 came from the audit; for later crates the plan says which decisions precede which step, per crate.
- *Rename the stages and move every file to a new layout*: churn with no effect on the result; names and paths stay where the content could be made right in place.
- *Keep reasoning in commit messages and add an index*: two places for one record, and the index is the part that goes stale.

**Confidence.** High that proof must be what runs, on the records, the ledger and the stop-loss: each answers a measured failure. Medium on the per-stage plan and the loop as written: they are reasoned from one crate's one stage, and no implementation or conformance has run. The expectations E1–E6 in the ledger say what will confirm or refute each.

**Reopens.** An expectation refuted at its checking point; a stage whose plan had to be abandoned mid-way; the maintainer finding that what reaches them (reports, drafts, records in Portuguese) does not let them follow the work.

## 2026-11-13 · Fixture programs in one language, replay with read tracking as the check of completeness, op kinds; unmeasured steps recorded as such

*Decided by the consultant at the review after the pilot of `ferrum-state` step A. Binding text: `docs/workflow/specification.md` §4 (`raw/fixture-ops.jsonl`), §5 item 3, §8 item 1; `tools/ledger.py`. The reasoning, with the measurements: `docs/decisions/ferrum-state.md`, "Step A after the pilot". Ledger: E7, E8.*

**Decisions.**
1. Fixture inputs of every crate are programs in the one language of `tools/cm6/program.ts`; a chunk's interpreter adds its ops. A crate's replayer is one evaluator, not one per chunk.
2. `tools/spec_check.py` replays every fixture from its recorded input with every key read recorded, and fails on an output that differs, a non-descriptive key never read, a literal in an `out` template, a fixture that calls no cm6 op, an op without kinds. A list of keys that may hold text is not a check of completeness: it missed 27 fixtures in the pilot.
3. Each op states what it observes (`api`, `internal`, `identity`, `callbacks`, `harness`), so that a crate's design decides per op what its replayer does with fixtures that observe more than cm6's documented API.
4. A step whose tokens were not measured is recorded with `tokens=none`, never `0`, and the report says how many runs are not measured. The orchestrator's own steps are not measured today: the transcript holds usage per message, but its format is internal to Claude Code and changes between versions (`mirrors/claude-code-docs/en/sessions.md` "Where transcripts are stored").

**Alternatives.** Per-chunk interpreters with no shared language: one dialect per chunk for the replayer to implement. Widening the key list: the next chunk's prose can sit under yet another key. Recording unmeasured steps as `0`: the report then reads them as free.

**Confidence.** High on 2 and 4; high on 1 for `ferrum-state`, medium for the crates that follow, whose calls (`view`'s geometry questions) may need forms the language lacks; they extend it in the tool, not per chunk.

**Reopens.** E7 or E8 refuted.

## 2026-11-13 · How the proof carries a difference that is on purpose: a floor, a register, and a reference that runs for every improvement

*Decided by the consultant, on the question the maintainer left to it on 2026-11-13 (`dev/maintainer/instructions/2026-11-13-piso-e-teto.md`): how validation and the test suite handle places where Ferrum is better than cm6 on purpose, without false errors. Binding text: `docs/workflow/README.md` §1 ("The floor and what goes above it", "When an improvement is made"), §2, §3; `docs/workflow/specification.md` §4 (`raw/improvements.jsonl`), §7; `docs/workflow/implementation.md` §2 items 2 and 4, §5; `docs/workflow/conformance.md` §0, G4, G5, G6, §4; `.claude/rules/decisions.md` D16; `.claude/rules/rust-crates.md` Tests 2, Annotations, Code 7. The principle it serves: `docs/decisions/foundation.md`, same date. Ledger: E10.*

**The problem.** Every check compares Ferrum with values produced by running cm6. If Ferrum is better somewhere, those checks fail there. The two easy ways out are both wrong: marking the failing cases as expected leaves Ferrum's behavior there checked by nothing (an error hides as an improvement), and changing the expected values by hand puts values from a person or from Ferrum's own code where values from a run used to be.

**The decision.** Three things, kept apart.
1. *The floor is never edited.* Fixtures and ported tests stay as cm6 produced them.
2. *A register* per crate (`raw/improvements.jsonl`) holds every way to be better, with its state, its moment and the behaviors an adoption may change.
3. *An adopted improvement has a reference of its own that runs.* It is written once as a patch to cm6 in the harness. A tool replays every fixture and runs cm6's tests on the patched cm6; the cases whose result changes get their new expected value from that run, and the tool fails if a case changes whose behaviors the row does not name. Ferrum is compared with cm6 where the two references agree and with the patched cm6 where they differ; reports count the two apart, per improvement. Where a standard defines the better behavior, its published test data runs against both the patched cm6 and Ferrum, so the patch is itself checked. An improvement that only adds has written tests.

So a difference on purpose is never a failure (the reference expects it), an error is never excused (outside the changed cases Ferrum must still equal cm6, inside them it must equal the patched cm6), and the list of what differs from cm6 is computed, not declared.

**What I tried before relying on it.** With the existing replay tool I replaced `findClusterBreak` in the harness by one built on Node's `Intl.Segmenter` (UAX #29, Unicode 17.0) for calls inside its domain, and replayed the four chunks that are programs today: 126 of 3,823 fixtures changed, all in chunk `text`, none in `change`, `rangeset` or `facet`; every changed fixture names a behavior of the row `state.imp.001`; 71 of the 181 fixtures of `state.findClusterBreak.B9` changed, the other 110 record cases where the two rules agree or calls outside the patch's domain. The run took the time of a normal replay. The harness file was restored afterwards and nothing of the trial is committed: the patch and the tool are written when the improvement is made. A fact found on the way, for the orchestrator: the harness loads the package's built file (`dist/index.cjs`), not `src/index.js`.

**Alternatives and why each lost.**
- *A list of fixtures to skip per improvement.* Ferrum's behavior on them is then unchecked, and the list is written by hand.
- *Expected values for the changed cases written by the test-writer from the improvement's description.* Prose as the source of values is what the specification stage showed to be the unreliable part (`docs/workflow/learnings.md` W39–W42).
- *A switch in Ferrum (a feature that restores cm6's behavior) so that the unchanged suite still runs.* Two behaviors to maintain forever, and the shipped one is the one not compared with cm6.
- *Compare only on inputs outside a predicate that describes the improvement's domain.* The predicate is a second description that can be wrong; the patched run computes the domain.

**Cost.** One patch per improvement that replaces a behavior, one tool written once (`tools/`), one more run of cm6 per oracle case. The patches of adopted improvements of a lower crate are loaded when the crates above record their fixtures, so their changed cases are found the same way.

**Confidence.** High that values must come from a run and that the floor stays untouched; medium-high on the patch as the general form: it fits an improvement that is local in cm6's code, and an improvement that would need a different structure in cm6 has no small patch. Such a one is decided with its own reference when it appears.

**Reopens.** E10 refuted; an improvement whose patch cannot be written in cm6; a changed case that the tool attributes to no row.

## 2026-11-14 · What a replayer leaves out is decided before it is written; a deviation's fixtures are computed on a patched cm6; outcome of E7

*Decided by the consultant at the end of step A of `ferrum-state`. Binding text: `docs/workflow/specification.md` §4 (`raw/decisions.jsonl` field `fixtures`, `raw/replay.jsonl`); `docs/workflow/implementation.md` §5; `tools/spec_check.py`; `tools/spec_facts.py`. The crate's side, with the measurements: `docs/decisions/ferrum-state.md`, "S5, second part". Ledger: E7 revised, E9 replaced by E12.*

**Decisions.**
1. *A fixture is not the unit of what Ferrum cannot reproduce; a call is.* The replayer leaves out the calls that have no counterpart and compares the rest of the fixture. A whole fixture is left out only when nothing remains.
2. *The fixtures of a deviation are computed.* The deviation is written into the harness copy of cm6, every fixture is replayed, and the fixtures whose output changes are the row's list. It is the mechanism already decided for improvements, used for the cases where Ferrum differs without being better. The replayer finds the same condition from its side, and the two lists must be equal.
3. *One row per op that observes more than the documented API* (`raw/replay.jsonl`), written by the consultant at S5. `tools/spec_check.py` counts the ops that have none; the count is not a failure, so that a worker who adds an op is not blocked by a file it may not write, and the specification is approved at zero.
4. *What only the signatures decide is frozen after the first run.* Inputs that Rust's types exclude cannot be listed before the skeleton exists. The replayer writes each one with its argument and value, the consultant approves the file, and the replayer then fails on any difference.
5. *`fixtures_to_list` and the part of `tools/spec_facts.py` that served it are removed*: no row owes a list, and a row's list is now computed by the run of item 2.

**E7** (step A after its pilot: budgets and runs of the check). Cost is confirmed: each of A2 to A5 stayed under 1.5 times its budget (1.37, 0.69, 1.17, 0.74) and the four cost 1,055,718 tokens against 1,250,000. Runs: A2 two, A3 three, A5 two; A4 four, of which two failed only because the check compared the form of an output and not its value (Q58), a defect of the tool that the worker could not fix. Recorded as revised, not confirmed: the expectation counted every run, and what measures a worker is the runs that fail on its own output. A later plan states it that way. Where the tokens went, per fixture: `change` 109, `text` 168, `state` 361, `facet` 446; `state` wrote its extensions in the vocabulary `facet` had built and cost less per fixture than `facet` did. Each chunk still wrote harness ops of its own (`list` twice, the arithmetic ops in `text` and in `state`); whether the language of `tools/cm6/program.ts` takes them is decided at the end-of-stage review (S6), before another crate writes fixtures.

**Alternatives.** A failing check for an op without a row: it blocks step B's worker on a file only the consultant writes. Hand-written lists: 170 fixtures for one row, found by a run in two minutes and by reading not at all. Recording E7 as confirmed: the fourth run happened.

**Confidence.** High on 1, 2 and 5. Medium-high on 4: it rests on a reading of a file by reason, which the first full run of the replayer will size.

**Reopens.** E12 refuted.

## 2026-11-14 · End of the specification stage of `ferrum-state`: the review, M20, harness ops into the language, positions written with the op, planned paths

*Decided by the consultant (M20; the question the second part of S5 left for S6; the end-of-stage review of `docs/workflow/README.md` §7), in the same call as the approval of the specification (`docs/decisions/ferrum-state.md`, "S5, third part"). Binding text: `docs/parity/ferrum-state/plan.md` step D; `docs/workflow/specification.md` §4 (`raw/positions.jsonl`), §5 item 3; `tools/check_refs.py`, `tools/README.md`; `.claude/agents/test-writer.md`, `.claude/agents/implementer.md`. Learnings: W48, W49, W50. Ledger: E13, E14, E15, E16.*

**The review, from the ledger.** The stage cost 14.4 million measured tokens before this call. More than half (7.66 million) went to six samples and their fixes, the loop already replaced for the next crate (E1, E2, open until `ferrum-view`). S2 made 22 of the 29 mismatches the samples found. Steps A and B, run to a plan with a pilot and a check that shows every error, stayed within 1.5 times their budgets and passed at the worker's own run; that is the shape the implementation plan keeps. Work an agent did that a tool could do: the 13 coverage artifacts (M20), and the reading of header marks against code. No expectation's checking point is reached at this point: E1, E2 and E11 wait for `ferrum-view`, E3 to E6, E8, E10 and E12 for the implementation and conformance of `ferrum-state`.

**Decisions.**
1. *M20: the tool drops the module-end artifact and says how many it dropped.* The zero-count range of each compiled module's last statement is a fact about the build, the same in every file of every crate, and an agent settled it 13 times by reading raw V8 ranges. The tool is changed once, by the orchestrator, and accepted on ground truth we already have: after the change `raw/coverage.jsonl` of `ferrum-state` holds exactly the 13 sites that are not artifacts, and the count of dropped ranges is 13. Dropping is printed, never silent. *Lost:* a per-file list of known artifact lines (written by hand, wrong at the next release); ignoring every site on a declaration line (`mirrors/cm6/state/src/char.ts:37` holds the artifact and a real conditional); leaving it to each coverage step (13 readings per crate, 36 in `view`, one per file of `mirrors/cm6/view/src`). If V8's data does not identify the range without such a list, the question comes back with that fact. Step B's cost per site (223,199 tokens for 33 sites, about 6,800) is the basis of the next coverage budget, counted on the sites left after the drop.
2. *Harness ops that several chunks wrote move into the language, now.* About twenty names (`let`, `map`, `record`, `list`, `item`, `ints`, `count`, the arithmetic) are registered by two or more chunks. Moving one into `tools/cm6/program.ts` is proven by the check itself: if one implementation replays every fixture of every chunk that uses the name, the ops were the same. The Rust replayer then writes each once, and `ferrum-view` starts from a fuller language. A name whose chunks need different implementations stays apart and says so. No fixture input changes (E8 holds). Ops that call cm6 stay per chunk: the replayer identifies an op by chunk and name. *Lost:* deciding it at the S0 of `ferrum-view` (the replayer of `ferrum-state` would by then have read two implementations of each and guessed which are equal); renaming to one vocabulary (it re-records inputs).
3. *Positions are written with the op, by its author.* In `ferrum-state` the marks were prose without the text, read afterwards for 272,809 tokens, and the reading found 32 numbers unmarked. From the next crate each op's positions, results and callback arguments included, get their row of `raw/positions.jsonl` when the op is written. Whether the rows become declarations the tool can check during replay is decided in the plan of `ferrum-view`'s specification, from what the replayer of `ferrum-state` needed.
4. *A document may name paths the work will create.* `tools/check_refs.py` reported the two paths of `design.md` that the implementation creates, and the implementation plan names more. A line `<!-- refs:planned … -->` declares them; they are counted while missing, and the line is reported as stale once a path exists, so it cannot outlive its reason. *Lost:* `refs:ignore` on each line (it also hides a wrong path on the same line); not naming the paths (the plan must say where the replayer lives).
5. *The definitions of `test-writer` and `implementer` no longer ask for scaling probes*, and point to the card for what the plan now defines (written tests, the unit's part of `implementation.md`). Cost is measured against cm6 at conformance (G8); a probe timed by the code's author is read by nobody.

**What I checked before relying on it.** The check after my rows: "ops … without a row of raw/replay.jsonl: 0", "checks passed". `tools/check_refs.py` after the change: 0 findings, the planned paths counted, and a stale marker reported when I named an existing path. The figures of the review are recomputed from `docs/progress/ledger.jsonl`.

**Confidence.** High on 1, 4 and 5. Medium-high on 2: the proof of sameness is mechanical, the number of names that turn out to differ is unknown. Medium-high on 3: it moves the work to the worker who knows the op, and a mechanical check of the marks does not exist yet.

**Reopens.** E13 to E16 refuted.


## 2026-11-14 · Each kind of work goes to what does it best: the intent, the record of the method's evolution, and the fixture runner of `ferrum-state`

*The principle was decided by the maintainer (their words: `dev/maintainer/instructions/2026-11-14-ferramenta-e-evolucao-do-metodo.md`, given in the orchestrator's session and passed on by it) and integrated by the consultant at their request. The rest was decided by the consultant; the maintainer offered the runner as a line of reasoning to evaluate, not as an order. Binding text: `docs/foundation/maintainer-intent.md` "How it is reached"; `docs/workflow/README.md` §5 "Tools before agents", §7; `docs/workflow/evolution.md`; `docs/parity/ferrum-state/plan.md` "Implementation"; `.claude/agents/consultant.md`, `.claude/agents/test-writer.md`, `.claude/agents/implementer.md`; `.claude/skills/ferrum-run/SKILL.md`; `tools/cm6/lang-cases.ts`, `tools/cm6/replay.ts` (`--trace`), `tools/trace_diff.py`, `tools/spec_check.py`, `tools/README.md`. Ledger: E18, E19, E20.*

**1. The intent.** One line was added to "How it is reached": where code does a step with more precision and at lower cost than an agent, the orchestrator and the consultant look for that automation, and the reasoning of a model is kept for judgment, research, critical review and synthesis; it is weighed case by case, is not a rule to replace agents, and often the best result is both. I added one sentence the maintainer did not write and that their intent already implies ("each change says what measurement will confirm it"): a tool is tried on real data before it is relied on and says what will confirm it. A tool nobody has seen fail is as much a belief as an agent's summary.

**2. The record of the method's evolution: a document of its own, `docs/workflow/evolution.md`.** Its readers are the orchestrator and the consultant at the moments they change the method, so it is built for that use: the levels the work went through (named by what does the work and how an error is found), the milestones as before, after and why with the measurement of each, the signs of a friction, the order of questions that says whether the answer is a tool, a fact the producer writes, a small language, or work kept in an agent, and the rules for building the tool. It holds no evidence of its own: it points to the learnings, the records and the ledger. The maintainer's ladder is kept; the rungs are named by function and not by the species of the metaphor, because a later agent must recognize its own situation in a rung, and "agents check agents" can be recognized where "Neanderthal" cannot.
- *Lost:* growing `learnings.md` (it is a dated log of observations, 96 long rows, read to revise one point; a training text needs an order and a conclusion); growing `docs/decisions/method.md` (records are not rewritten, and a pattern spread over fifteen entries is what the reader lacks); a section of `README.md` (loaded whole by every session, and this is needed at four moments).
- It is read at the four review points and before a card for a step no crate has run; `README.md` §5 and §7, the consultant's definition and `/ferrum-run` point to it. It is not injected into every session.

**3. The practical case: should a data-driven runner in Rust, or a generator, consume `fixtures/*.jsonl` directly?** Yes to the runner, and it was already the centre of the implementation plan: the replayer reads the fixture files, and none of the 4,965 fixtures becomes a written test. What the maintainer's question made me do is ask it of every other piece of the stage. What I found, and decided:

- *The bindings stay with an agent.* A generator would need a declaration of each op. There is none: an op is a function in `interp.ts`, 255 of them touch cm6, and its Rust form needs the crate's signatures (D12, D14), the text each position is measured on (`raw/positions.jsonl` words it in 126 different ways) and what `raw/replay.jsonl` leaves out. Counted today from `raw/fixture-ops.jsonl`: 28 ops of the language, 36 harness ops of chunks, 255 that touch cm6. What a tool can do there is the join: the ops the replayer registers against the ops the fixtures run.
- *The evaluator of the language gets a reference that runs* (step R, `tools/cm6/lang-cases.jsonl`). The plan had the evaluator, the ops of chunk `text` and 32 ported tests in one step of 700,000 tokens, with the evaluator tested on literals its author would type, and unable to show a single fixture `equal` until the code existed. So the first failures would have mixed three possible causes. Now 47 programs that touch no cm6 value are recorded with the outputs `program.ts` gave, and the core must reproduce them before any op of a chunk exists. It is the rule "expected values come from a run" applied to the one part of the proof that had escaped it.
- *A failing fixture is located by a tool* (`tools/cm6/replay.ts --trace`, `tools/trace_diff.py`). The specification's unbounded cost was agents settling by argument what a run could settle (7.66 million tokens). The same shape was waiting in "A check that is wrong": an implementer and a test-writer, each seeing half. The trace gives the first evaluation at which cm6 and Ferrum differ and whether that op touches the crate at all.
- *Every check of a step is one tool* (`tools/impl_check.py`), run by the worker on its own output. The plan left the checks of every step to commands the orchestrator would compose. Steps A and B showed that a worker who can run its whole check is merged clean. The literal comparison of ported tests, which conformance G3 asks for, runs when the tests are written, not after their code.
- *The replayer writes facts per fixture and the tool counts.* Aggregation per behavior and per decision row moves out of the Rust the test-writer writes and into the tool, where the next crate has it for nothing.
- *The directory of fixtures is a parameter*, so the same replayer serves the fresh seeds of conformance and the improved fixtures of the delta.

**What I tried before relying on it.** The trace was run on fixtures of chunks `text` and `state` (a program with nested `map`, an uncaught throw, values of cm6 classes) and on a language case. `tools/trace_diff.py` was run on an equal trace (exit 0) and on two altered ones: a changed result of an `api` op inside a `map`, with its consequences up the chain, was reported at the inner op and not at the outer ones; a changed harness op was reported as the replayer's. The 47 language cases were generated, read one by one, and one sub-case was removed because its output was an error message of V8 (`over.map is not a function`), which a Rust evaluator should not have to imitate. `python3 tools/spec_check.py ferrum-state` passes with the cases wired in (172 seconds in this session). `tools/impl_check.py` is not written: its inputs do not exist yet; the plan fixes its subcommands, the formats it reads and how each check is accepted.

**Alternatives and why each lost.**
- *Generate one Rust test per fixture.* 4,965 tests that copy data into source: the copy goes stale, and a new fixture needs a new generation. The runner reads the data.
- *Generate the op bindings from `interp.ts` or from the headers.* Generation from code or prose is an agent's reading under another name; where it guessed wrong, a non-ASCII fixture would fail and an agent would repair generated code it did not write.
- *Run cm6's own tests and the TypeScript interpreters against Ferrum through a JavaScript binding*, porting nothing. It needs a cm6-shaped JavaScript facade over every public item, with callbacks crossing the boundary and positions converted inside it: the same number of bindings as the ops, in a form no user of Ferrum will ever call, plus a dependency of its own. The ported tests also show that the Rust API can express what cm6's users write, which a facade would hide.
- *Replay each fixture with cm6's recorded results in place of Ferrum* to prove the evaluator on all 4,965 programs before any code. It needs a model of the order in which every op evaluates its arguments, for a gain the 47 cases and the trace already give at a fraction of the work. Taken up again if E18 is refuted.
- *A shared crate for the replayer's core now.* `ferrum-view` will read the same language, but what it shares beyond the evaluator is not known. The core's language module imports nothing of `ferrum_state`, which a tool checks, so lifting it later is a move.
- *Leave the plan as it was.* It was sound on what proves parity; it left to agents four things a run or a join decides.

**Cost.** Step R adds a context: R 250,000 and U1 checks 500,000 against 700,000 before. The tool of the stage is the orchestrator's work before U0. In exchange the reusable part of the replayer is measured apart from the per-chunk part, which is what the budgets of U2 to U4 and of `ferrum-view` need.

**Confidence.** High on the intent text and on keeping the bindings with an agent. High that the language cases and the trace are right in kind; medium-high on their size (47 cases cover every op of the language, not every interaction). Medium on the budgets of R and U1: no implementation step has been measured. Medium-high on the form of the evolution document: its test is whether a later review uses its questions.

**Reopens.** E18, E19 or E20 refuted; an op vocabulary in `ferrum-view` regular enough to declare (then a generator of bindings is asked again, with that fact); a review of the method that does not use `docs/workflow/evolution.md`.

**Raised by me, not asked.** (1) G3's literal comparison was a conformance step for a defect made at the checks step; it now runs where the defect is made. (2) The replayer of `ferrum-state` is also the driver of the differential oracle (G5) and of the improvement delta, so its fixture directory must be a parameter from the first version. (3) The maintainer's question assumed the fixtures are "100% structured"; the inputs are, the ops' bindings are not, and that boundary is where the agent's work lies.

## 2026-11-15 · M21: a ledger row names the model that served the run

**Question (M21).** A `step` row of `docs/progress/ledger.jsonl` said at which effort a run was made but not which model made it, so a run of the consultant on Fable 5.2 at `medium` read as an Opus run at `medium`.

**Decision, by the maintainer** (their words: `dev/maintainer/instructions/2026-11-15-modelo-no-ledger.md`; carried out by the orchestrator on their instruction, with no consultant call). Every `step` row has a field `model`, the id of the model that served the run (`claude-opus-5-5`, `claude-fable-5-2`), never an alias. The rows already written are filled from the fact the maintainer gave: from 2026-11-13 the orchestrator and the consultant ran on Fable 5.2 at `medium`; every other row is Opus 5.5.

**What was changed.** `tools/ledger.py`: `model` is a required key of `step`, a value that is not a model id is refused, and the report prints the runs by role, model and effort (seen: a row without `model` and a row with `model=opus` are both refused). `docs/progress/ledger.jsonl`: the 78 `step` rows carry `model`; the four orchestrator rows from 2026-11-13, recorded with effort `none`, now say `medium`. `docs/workflow/README.md` §5 "State", `tools/README.md` and `.claude/skills/ferrum-run/SKILL.md` say so.

**Left as recorded, not verified.** One consultant row of 2026-11-13 ("A pilot review") says effort `high`, where the maintainer's fact says `medium` from that day; its model is set to Fable 5.2 and its effort is unchanged, because nothing here shows which of the two is right for that run.

**Bears on later reviews.** E3 and the budgets of the pilot review compare rows by effort; they now read the model beside it. The model of a worker's row is the one its definition names (`.claude/agents/*.md`), which the orchestrator does not see confirmed in a finished run's notification; a failed run's notice did name it (`claude-opus-5-5`, step R, 2026-11-15).

**Binding text.** `tools/ledger.py` (docstring and `KEYS`); `docs/workflow/README.md` §5 "State".

## 2026-11-15 · The pilot review of the implementation of ferrum-state: what changes in the method

*Decided by the consultant at the review of the pilot of `ferrum-state`'s implementation (`docs/workflow/README.md` §7). The crate's part (Q84, Q85, the left-out entries, the budgets): `docs/decisions/ferrum-state.md`, "The pilot review of the implementation". Binding text: `rustfmt.toml`; `.claude/rules/rust-crates.md` Code 5; `tools/impl_check.py`; `tools/ledger.py`; `tools/README.md`; `docs/parity/ferrum-state/plan.md` "Ported tests and written tests" and the paragraph on one worker at a time. Ledger: E25 to E29, and the results of the pilot's expectations.*

**1. The code is formatted, and every step's tool checks it.** Step R reported that `cargo fmt --check` differed in the tests and in `charcategory.rs`, with no configuration and no check. Unformatted code is debt that every later diff carries, and checking it is a tool's work at no tokens. The configuration is the one the crate was already written at: with `max_width = 120` and `use_small_heuristics = "Max"`, 28 hunks in 14 files differ; with rustfmt's defaults, 311 hunks in 29 files. So the change reformats least of what exists. `cargo fmt --all -- --check` runs in every subcommand of `tools/impl_check.py` (seen to fail on the 14 files); the workers run `cargo fmt --all` before their checks. The orchestrator formats the tree once, in a commit of its own, and lists the test files as changed for `rustfmt.toml` only, so that the "checks unchanged since their commit" check stays exact. *Lost:* rustfmt's defaults (ten times the churn, for a width nobody here reads at); no check (the debt grows with every unit).

**2. A model of a unit written by its `test-writer`.** U1's test-writer, unasked, wrote a flat model of `Text` in scratch to run its ops before the code existed: 697 fixtures `equal` and the control run at zero against it, and the first replay of the real code gave no mismatch. A model cannot make a false pass: expected values come from cm6 whatever runs them, and the control run catches a replayer that compares less. Its risks are cost and contamination. So it is the worker's own means inside its budget, never committed nor shown to an implementer, reported as counts against a model, and written only where it drops structure and keeps values; where the values are the algorithm (change sets, range-set layers, state slots), it is the unit written twice by the worker who must not write it. No budget counts on one, and rounds of a wrong check are budgeted instead. *Lost:* forbidding it (it bought U1's clean first replay for a part of one budget); requiring it (for U2 and U4 it is the code); a model shared with the implementer (the checks would then be written against the code they check). Reopens: three rounds of a wrong check in one unit.

**3. One worker at a time**, through the stage: the reasons are in the crate's record. What generalizes: a lesson of a code step reaches the next unit's checks only if they are written after it, and an isolated worktree lacks every untracked input (`mirrors/`, `.harness/`, `target/`).

**4. What has no compared fixture is sorted by the tool.** `code` and `handoff` print the behaviors a row of class `form` names and those whose every fixture needs input the signatures exclude, and fail on the rest. A list of such behaviors is never written by hand; the printed list is read by the consultant with the left-out file.

**5. An expectation with several checking points gets a `partial` result** (`tools/ledger.py`): the report shows it open with the date of the partial result. Five expectations of this stage name both the pilot and the end of the stage; closing them at the pilot would drop the second measurement, and re-issuing each under a new id would scatter one expectation over two. A value other than the four outcomes is refused (seen).

**Confidence.** High on 1, 4 and 5. Medium-high on 2: one unit measured, and the evidence that it helped is one clean replay. Medium-high on 3.

**Reopens.** E27 or E28 refuted; a stage that runs without a usage-limit cut (3).

## 2026-11-19 · The end-of-stage review of the implementation of ferrum-state

*Decided by the consultant at the end of the implementation of `ferrum-state` (`docs/workflow/README.md` §7). The crate's part: `docs/decisions/ferrum-state.md`, "The end of the implementation stage". Binding text: `tools/ledger.py` (what `tokens` counts), `tools/impl_check.py` (two messages), `docs/workflow/evolution.md` §2; ledger: the results of E4 to E36 whose point was this stage, E38 to E40.*

**Where the tokens went.** The stage counts 8,221,508 in the ledger's unit, against about 6 million planned (E6, refuted). The workers' steps came to about 5.0 million, within what the plan's table and rounds allowed; the consultant's sixteen calls came to about 3.2 million, 39 percent of the stage. Rounds that changed checks after their code: nine of the `test-writer`, 325,774, 4.0 percent (E19). The steps that made what a later step found: the U4b checks (7, found at the U4 code step), and my own decisions of this stage (four low escapes, from Q75 to Q78, Q92 and Q93, Q96 to Q99, Q100 to Q104; four more found in this call: the two sites Q109 missed, a row's list computed without D12, and the rule of E26 accepting behaviors with a half Ferrum can express). So the overrun is the consultant's, and it is the price of each step's questions being decided by reading cm6 again rather than argued; I make no change to it now, because the ledger cannot tell a call's fixed context from its reading (next point), and a change without that number would be a guess.

**What the ledger's `tokens` counts.** The number is the `total_tokens` of a run's completion notice. Claude Code's documentation says the Agent tool's `totalTokens` covers the run's final request only, input, output and cache together, and is "not a total across the whole run" (`mirrors/claude-code-docs/en/hooks.md`, the table of the Agent tool's `tool_response`); a total across a run of a hundred requests would be tens of millions, not the 200,000 to 560,000 recorded, so the ledger has been counting the context each run ended with. That is a consistent measure of how much a run had to hold, and every budget and expectation here is in that unit, so their comparisons stand. It is not what the work consumed, and a run that compacted under-counts. `tools/ledger.py` now says so, and the orchestrator confirms the source. A true count needs the usage counters `mirrors/claude-code-docs/en/monitoring-usage.md` describes, which need the environment's setup; asked when a decision depends on consumption rather than size. *Lost:* relabelling every row (the unit did not change, only its name was imprecise).

**Two tool messages that were read wrongly.** `handoff` printed "99 of 143" for 99 holding and 44 not, and the first five fixtures of a list of 34; both were carried to me as the reverse and as five. Each line now prints both counts and the whole list. A message a reader can take two ways is a defect of the tool, as a silent exception is.

**A rule widened is applied by a run over the file, not by recalling its sites.** Q109 said every site was read and missed two (rangeset.ts:290, facet.ts:547); this approval found them by grouping every left-out entry by chunk, op and argument with its values. `handoff` prints that grouping from now on; the next widening of D12, and the approval of `ferrum-view`'s left-out file, read it.

**For the plan of `ferrum-view`'s implementation, not changed now.** Five questions of this stage were a signature that could not take what a fixture passes (Q87, Q97, Q100, Q110, Q115; E21 expected at most three). `raw/fixture-ops.jsonl` holds the kinds each op passes, so a join of those kinds against the skeleton's signatures can run before the skeleton is approved. It is weighed when that plan is written.

**Confidence.** High on the reading of `tokens` (the documentation and the size of the numbers agree); the orchestrator's confirmation closes it. High on the two messages. Medium on the grouping as a guard: it showed both misses here, and E40 measures it.

## 2026-11-24 · M22: the checks of a finished stage mean the same at every session

*Decided by the consultant (M22, raised by the orchestrator). Binding text: `rust-toolchain.toml`; `docs/workflow/README.md` §5 "Versions"; `docs/parity/ferrum-state/plan.md` "Conformance" step 1 (the dated nightly); `dev/maintainer/ambiente.md`. Ledger: E44.*

**Question.** In a fresh container (node 22.23.5, rustc 1.100.0) `spec_check ferrum-state` failed on 215 fixtures whose only difference was the stamp `engine.node` (22.23.4 recorded), and `handoff` failed on 8 warnings of a clippy lint new since 1.97.0 (`chunks_exact` with a constant size, `crates/ferrum-state/src/change.rs`). Nothing pinned either version.

**What a check is for decides which version it must run on.** The two failures are of different kinds.
- *Rust* runs Ferrum's own checks: build, lints, rustfmt, rustdoc's JSON format (which `tools/ferrum_pub.py` reads, format 57 at 1.97), and Ferrum's Unicode data (Q7: word categories come from Rust's `char`). A newer toolchain changes what those checks say about code that did not change, so the same commit passes at one session and fails at the next, and no failure can be told from drift without a diff by hand. That is a check whose meaning moves; it is pinned. *Tried:* `rustup toolchain install 1.97.0` took 18 seconds here; `rustup` installs a toolchain file's version by itself at the first `cargo` call (tried with 1.96.0 in a scratch directory); with 1.97.0, `python3 tools/impl_check.py ferrum-state handoff --since text=c0ba180,change=ea896a1,rangeset=126dad7,state=efdebd2` ends "checks passed" in this container on node 22.23.5. `Cargo.toml` already declares `rust-version = "1.97"`. The nightly the coverage needs is pinned by date in the plan's command (`nightly-2026-11-23`, installed here in about 20 seconds with `llvm-tools-preview`).
- *Node* runs cm6, and its output is the reference. If a Node changed a result, that would be a fact about the reference, and the regeneration check failing is the right alarm. The patch version changed no result here: the 215 lines differed only in the stamp. The stamp's other two members, `unicode` and `icu`, are the engine data results depend on (Q7); `node` is a description no reader of a fixture uses (the interpreter and the replayer leave `engine` out). So the stamp keeps `unicode` and `icu` and drops `node`, and the Node version of each verdict is recorded where `conformance.md` §1 already asks. Pinning Node instead would make the alarm silent: a session would have to install the old Node, and a result that changes on today's engines would never be seen.

**Decision.**
1. `rust-toolchain.toml` pins 1.97.0 (minimal profile, clippy and rustfmt); the coverage nightly is `nightly-2026-11-23`. A toolchain change is a commit of its own, between stages, that runs every finished crate's checks again, fixes what new lints find, and compares `char::UNICODE_VERSION` with the fixtures' `engine.unicode`. The 8 warnings of 1.100.0 are fixed then, not now: the code was approved at 1.97.0, and conformance is about to read it.
2. The writers of `engine` in chunk `text` (`docs/parity/ferrum-state/oracle/cm6/text/gen-category.ts:26`, `probe-category.ts:9`, `s4-tags.ts:237`, and the comments at `gen-category.ts:8` and `interp.ts:8`) stop writing `node`; the 215 fixtures of `fixtures/text.jsonl` are regenerated, differing in that member only. The orchestrator makes the change, since the generators are the specification's, and checks that the diff is exactly the 215 `node` members and that `spec_check` then passes on the container's Node.

**Lost.** *Pin Node* (an `.nvmrc` or a Node downloaded by the harness): it keeps the check passing by hiding the one change it exists to show. *Compare fixtures ignoring `engine.node` in `spec_check`*: an exception in the tool for a field nobody reads, where the data can simply not hold it. *Fix the lints now*: it changes approved code at the start of conformance for a tool's opinion, and the next toolchain would bring the next lints anyway. *Track the newest stable*: every session could find new failures in finished work.

**Confidence.** High on Rust: tried. High on the Node part: the diff showed only the stamp; what I did not verify is that no Node of another minor version changes a result, which is what the check now reports if it happens. **Reopens.** A Node that changes a fixture's result; a reason to raise `rust-version` (a library, a feature), which is then the toolchain step of item 1.

## 2026-11-24 · M23 and M24: budgets as context, a stop-loss that can stop, and where G8 is written

*Decided by the consultant (M23 and M24, raised by the orchestrator on 2026-11-24 at step 1 of the conformance of `ferrum-state`). Binding text: `docs/workflow/README.md` §5 "Budgets" and "Stop-loss", §8 (the transcript); `.claude/agents/test-writer.md` (write guard); `docs/parity/ferrum-state/plan.md` "Conformance" step 2. Ledger: E43 (partial), E48, E49.*

**M23. Step 0 used 55,034 tokens of a budget of 30,000.** *What the number is.* The ledger counts the size of a run's last request (2026-11-19, "What the ledger's `tokens` counts"): the context the worker ended with, not what it consumed. So a budget is a context size, and mine for step 0 was below what the card required it to hold: the smallest runs of a `test-writer` or an `implementer` in this crate end at about 15,000 tokens (14,427, 15,771, 16,198 in the ledger), which is the definition, the rules a crate file loads and a card; step 0's card asked for `driver.rs` (about 740 lines), `rules.rs`, the docstring and `control()` of `tools/impl_check.py`, and a tool run of 1,123 seconds whose output it kept. That is 50,000 to 60,000 by the same arithmetic, which is what it used. The overrun is the estimate's, not the worker's: it finished in one attempt and every check passed. *Decision.* A budget is estimated when the card is written, as the role's smallest run plus the files the card asks to read whole plus the tool output it keeps plus a third (`README.md` §5 "Budgets"); the plan's figure is a ceiling the estimate is checked against, and a card whose estimate exceeds it says so. The budgets of steps 2 to 4 are estimated that way when their cards are written. *The stop line that could not stop.* The orchestrator wrote that a worker returns only at its end (`learnings.md` W51). That holds for the notice, not for the run: a running subagent's transcript holds every request's `usage`, and I read my own while it ran (`README.md` §8). The orchestrator watches it from the spawn and stops the worker at the line with `TaskStop`, after trying both on its next worker. The same transcript gives what a run consumed (the sum over its requests), which the ledger has lacked since 2026-11-19: `tools/ledger.py` gains an optional `consumed` key beside `tokens`, filled from the transcript by the orchestrator, so that a later decision about cost can rest on consumption. *Lost:* raising the plan's figures by a factor (it repeats the error at another scale); dropping the stop line for workers that return at the end (the line is now enforceable). *Confidence:* high on the reading of the number; medium on the estimate, which E48 measures on steps 2 to 4.

**M24. G8 is a `test-writer`'s, and its guard refused the paths.** *Who writes it.* Benchmarks are written from the `cost` rows, and their inputs are chosen to show the cost class; an author who has read the code could choose inputs that flatter it, so the role that has not seen the implementation stays. *Where.* `crates/ferrum-state/benches/g8.rs`, one target with `harness = false`, whose `[[bench]]` entry in the crate's manifest the orchestrator adds (three lines, before the card); the cm6 script and both sides' results in `docs/parity/ferrum-state/bench/`. The `test-writer`'s guard now allows `crates/*/benches/**` and `docs/parity/*/bench/**`; `oracle/` stays closed to it, since its generators are the specification's. *With what.* `std::time::Instant` and `std::hint::black_box`, the median of repeated runs, on both sides by the same method: a growth class across a factor of 100 is visible without the statistics a harness crate adds, and `design.md` §1 says "No other" dependency for a reason that holds for dev-dependencies too (every dependency is reviewed and licensed). *When.* The worker runs each entry at size n to see it work; the timed run is the orchestrator's, when mutation and replays are not sharing the machine. *Scope.* One entry per item that has a local or logarithmic behavior (236 items), not per behavior; the 173 behaviors no pattern of `conf_check costs` settles are sorted by the worker first, and I read that sort at the acceptance. *Lost:* tests under `tests/` with `#[ignore]` (built in debug by `cargo test`, and a file `impl_check` would count as a test file of a unit); an `examples/` binary (no manifest entry, but examples are what an application reads as usage); criterion (a dependency tree for statistics the class does not need). *Confidence:* high.

## 2026-11-24 · M25 and M26: how a conformance verifier's work is split, and how a mutant that times out counts

*Decided by the consultant (M25 and M26, raised by the orchestrator at step 3 of the conformance of `ferrum-state`). Binding text: `docs/workflow/README.md` §5 "Budgets"; `docs/workflow/conformance.md` §2, G2 "Mutation"; `docs/parity/ferrum-state/plan.md` "Conformance" steps 1 and 3. Ledger: E50, E51.*

**M25. The verifier of U1 did not fit its card's budget.** *What the numbers say.* It ended at 189,546 tokens against an estimate of 140,000 (1.35 times, below the stop line of 1.5) after 67 requests that consumed 6,966,849, with 140 verdicts written and three parts left: U1's coverage lines and branch outcomes, the read of the replayer's core, and the hazards traced one by one. Its largest cost was what made its mutant verdicts worth having: it built each of the 26 surviving mutants into a copy of the crate and ran a probe against it, which turned 20 into confirmed findings with inputs and 6 into shown equivalents (W52), where a reading gives guesses. The card's estimate counted files to read and verdicts to write, not runs. The other units are larger: 50, 36, 33 and 66 sampled items against U1's 35, and 13, 29 and 16 survivors, with the timeouts still to sort (M26). One card per unit would then overrun everywhere, and a run near 200,000 tokens is where parts get dropped for budget, as here.

*Decision.*
1. A budget counts every run the card asks for, beside the files and tool output (`README.md` §5); a card whose estimate is above about 140,000 is split by the kind of work, so that no run holds what another part needs.
2. For this stage, each unit's verification is two runs: *readings* (written tests, sampled cases, hazards, G9's list, the G7 lists, the replayer reads) and *gaps* (surviving mutants by running them, missed branch outcomes and unsorted lines, the unit's G5 mismatches). A unit whose two estimates add up to less than 140,000 runs as one. The rest of U1 is one run, which also writes again the three verdicts Q136 settles.
3. Two parts of the work are determined by data, and go to tools of the orchestrator before the next run: which checks name the behavior a hazard sits on (`conf_check hazards <unit>`, from what `handoff` writes), and applying a mutant, building a probe against it and diffing the probe's output with the unmutated one (`conf_check mutant-probe`, the U1 verifier's 23-line script made general). The verifier keeps what needs judgment: whether a check exercises the hazard, which inputs a probe must contain to reach a mutant, and which behavior a difference breaks. The probe tool is tried on U1's 26 mutants and must give the verifier's 20 and 6 before a gaps run relies on it.

*Lost.* A larger budget for one run per unit (the context would pass 200,000 on U2 and U4b, and the parts most likely dropped are the ones no later step reads); judging mutants by reading only (cheaper, and what W52 shows would have missed the confirmation of all 20); a split by items (each run then reads the same sources and lists, and both halves need the probe). *Confidence:* medium-high; E50 measures it on the next runs. *Reopens:* a split run that ends far below its estimate (the split was not needed), or a gaps run whose probe tool does not reproduce U1's verdicts.

**M26. A mutant that times out.** *What the rerun shows so far.* At 17:13 UTC, 10 of the 86 mutants run again with `--timeout 300` (33 times the 9-second baseline) had all timed out again, and every log names tests that ran for more than a minute: ported cm6 cases such as `test_cm6_state_21_can_split_changes` and `test_cm6_change_12_can_map_a_deletion_over_an_overlapping_replace`, whose test binaries finish in 0.05 seconds unmutated (`mutants.out/log/baseline.log`). Those are loops that do not end, not slow code. *Decision.* A timeout is not a survivor by default, nor caught by default; the logs decide. One that times out again at about thirty times the baseline while its log shows a test of a sub-second binary still running after a minute is caught by a hang, and the verdict counts it apart from the caught ones. Any other (expected only where the long-running test is the replay test, which runs for seconds) is run once more at ten times that limit and counts by its outcome there, or as a hang. One that ends at the longer limit counts by its outcome, and a survivor goes to its unit's verifier like any other. `conf_check mutants-missed` prints the sorting from the logs, so nobody reads 86 logs. *Why a hang counts as caught.* A check that never ends never passes, and a loop the person editing would see as a frozen editor is what the tests forbid: they expect a result. *Lost:* counting every timeout as caught (a mutant that only makes the code slower would then pass unread; the second limit separates it); counting every timeout as a survivor (72 verifier verdicts on mutants the logs already settle). *Confidence:* high on the rule; the share of timeouts that need the second limit is E51's measurement. *Reopens:* a timeout sorted as a hang that ends at a longer limit.

## 2026-11-24 · M27: what fills a verifier's context, and how the rest of step 3 runs

*Decided by the consultant (M27, raised by the orchestrator when the stop-loss fired on the second run of U1's verification). Binding text: `docs/workflow/README.md` §5 "Budgets" and "Stop-loss"; `docs/parity/ferrum-state/plan.md` "Conformance" step 3 and "Expected cost"; `docs/parity/ferrum-state/cards/verifier.md` (run kinds, the `hazard` lines, the budget paragraph); `docs/workflow/learnings.md` W53 (corrected). Ledger: E48 and E50 refuted, E54, E55.*

**Question.** The rest of U1 was estimated at 115,000 by the rule M25 amended and was stopped at 178,008 with two of its four parts done. The question read the overrun as the rule's figures for runs (10,000) and for the worker's own work (a third) being too low.

**What the transcripts show.** I measured both runs of U1 from their transcripts with a script (per request: the four usage counts, the tool results by tool and by what the command read, the attachments, the worker's own output), and attributed each request's growth in context to what arrived before it.
- *Runs were not the cost.* Of the second run's 59 shell results, those that ran a tool, a build or a probe gave about 700 tokens; the rest read files (`sed` over `driver.rs`, `lang/`, `src/`) or data (`python3` over `raw/*.jsonl`). In the first run, the one that judged 26 mutants by running them, tool and probe output was about 8,500 tokens. So M25's premise, that running the mutants filled the first run, was wrong too: in both runs reading filled the context, and the split M25 made still holds for a different reason (below).
- *A byte costs about 0.43 tokens, not 0.25.* On the seven largest single results with nothing else arriving in the same step, the context grew by one token per 2.1 to 2.7 characters (one result of 14,301 characters added 6,855 tokens; one of 18,366 added 6,852). What these agents read is code with line numbers, JSON rows and Markdown full of ids, which tokenizes far below the four characters per token the rule assumed. The card's list of what to read was about right in bytes and 1.7 times short in tokens.
- *The base was short.* The first request was 10,494 tokens. The first read under `crates/` attaches the rules scoped there (`decisions.md`, `rust-naming-decisions.md`, `rust-crates.md`: 34,700 bytes), about 12,000 tokens, which the rule's base of 15,000 (measured on roles that had them) did not give the verifier; with its card, about 27,000.
- *Lookups outside the card are a constant of the role.* Both runs spent about 30,000 tokens reading what no card listed and every verification needs (`design.md` §10, decision rows, behavior rows extracted with `python3`, the unit's own verdict file).
- *Own work is about 0.45 of what it reads.* The output tokens (reasoning, which stays in the context, and the tool calls) were 48,123 against 119,383 tokens of input added in the second run (0.40), 54,417 against 121,449 in the first (0.45). "A third" was close; the error was in what it multiplied.
- *What the question's other figures were.* The extract of hazards was read once, in three parts of one file (three `Read` calls), not six times. The run stopped after holding the hazards list (about 18,000 tokens) and before tracing any hazard, so no run has yet measured what tracing a hazard costs.

With the corrected terms, the card of the second run comes to about 180,000 tokens for its four parts: the stop line was crossed because the estimate was wrong, not because the worker strayed.

**Decision.**
1. *The budget rule* (`README.md` §5): the estimate is the role's base (first request, the rules its paths load, its card), plus 1.45 times what it reads or keeps, at about 2.3 bytes per token, with the role's lookups outside its card counted (about 30,000 for a conformance verifier). A card above about 140,000 is split by kind of work, then by item group; two parts that fit together run together.
2. *A run stopped at its line is not resumed.* It holds what its line allows; resuming it adds the remaining work on top. Its appended verdicts stand and the next run starts from the unit's file. The stopped run of U1 is not resumed.
3. *Each unit's verification is split into three kinds* (`plan.md` step 3): *tests* (G2, G3), *hazards* (G7 hazards one by one, G9 and the G7 lists, the U4b replayer read, the `item` lines), *gaps* (mutants by probe, branch outcomes and lines, G5 mismatches, survivors of the timeout rerun). The M25 split into readings and gaps put the hazards and the tests in one run; with reading costed correctly the readings of none of U2 to U4b fit in 140,000. The cut is by kind because each kind reads different sources: the tests run reads test files and cm6's tests, the hazards run reads the unit's source and the hazards, the gaps run reads mutated lines and writes probes. Where a kind is still above 140,000, it is cut by item group (cm6 class or function), which keeps one module per run where the unit has two.
4. *Hazard verdicts get their own lines.* The card had no kind for a hazard, so a run could trace every hazard and leave no line showing it did, and the completeness E50 asked for could not be counted. Each hazard gets a line of kind `hazard`, id `<behavior id>:h<n>`, verdict `EXERCISED` with the check or `FINDING`; the run's check counts them against the tool's list.
5. *Two tools first, because their output is data the verifiers now gather by hand.* `conf_check hazards` prints, per behavior, its text, its item's decision rows, its compared fixtures by text class and the ops they run, and the hazard ids, restricted to item groups; the verifiers' `python3` lookups over `raw/behaviors.jsonl` and `raw/decisions.jsonl` were nearly half of their lookups (about 13,400 and 14,100 tokens), and whether a compared fixture holds text outside ASCII settles the first half of every D1 hazard. `ledger.py usage` gains the breakdown I made here, so that each pilot recalibrates the rule from its own transcript by a tool, not by my reading.
6. *U1's rest is the pilot of hazard tracing*, in two runs: `Text` and `Line` (84 hazards, about 140,000), then the other groups (67 hazards) with the three lines Q136 settles (about 120,000). The verdicts the two earlier runs wrote stay. After them the orchestrator takes the tokens per hazard from the breakdown and estimates the hazard runs of U2 to U4b from that number. Then U2, U3, U4a, U4b, each tests, hazards, gaps, with the estimates the plan lists. U1's gaps run again only if the timeout rerun leaves survivors in `char.rs` or `column.rs`.

**What it costs.** Step 3 comes to about 2.3 million in the ledger's unit (367,554 already spent on U1), against the 1.05 million planned. That figure sums each run's final context. What the runs consume (the sum over their requests) does not grow with the split: a run's fixed part (base and lookups) sits in every request whichever run makes it, and the part that grows with the work is quadratic in a run's length, so shorter runs consume less for the same reading. The ledger's figure goes up because each run's base is counted again; the consumption, which is what the plan pays, goes down. *I did not measure this on these runs*; E54's results, with `consumed` recorded per run, will show it.

**Lost.**
- *Raise the runs' figure and the third*, as the question read it: it would have fitted the second run by correcting the wrong terms, and failed on the next run that reads more and runs less.
- *Resume the stopped run*: it would trace 151 hazards on top of 178,000 tokens.
- *One larger budget per unit, no split*: a unit near 300,000 tokens, where the first run showed parts dropped.
- *Trace a sample of hazards*: G7 asks that every hazard have a check, every item with a hazard is in the sample by design (all 707 hazards are on sampled items), and a hazard with no check is exactly the silent divergence nothing later finds. Thinner evidence is not the saving.
- *Leave the rules of `crates/**` out of a verifier's context*: the verifier checks code against `decisions.md`; the naming file is the only one it barely uses, about 4,000 tokens a run, not worth a change to what loads where.

**Confidence.** High on the diagnosis: two transcripts agree on every term, and the corrected rule reproduces the second run. Medium on the estimates in the plan: the per-byte figure was measured on these roles' material and may differ on cm6's TypeScript; the cost of tracing a hazard is unmeasured, which is why U1's two runs are its pilot. **Reopens.** A run of the rest of step 3 that ends outside 0.75 to 1.25 times its estimate (E54); hazard runs whose lookups stay near 30,000 after the tool change (E55).

## 2026-11-26 · M28: estimating a run by its kind, and the rules that a shell read does not load

*Decided by the consultant (M28, raised by the orchestrator at step 3 of the conformance of `ferrum-state`; observation W54). Binding text: `docs/workflow/README.md` §5 "Budgets"; `docs/parity/ferrum-state/plan.md` "Conformance" step 3 ("Estimates after M28") and step 4; `docs/parity/ferrum-state/cards/verifier.md` ("Sources", "Budget"). Ledger: E54 settled, E56.*

**Question.** By M27's rule, U2's two *gaps* runs ended at 0.73 and 0.59 of their estimates and U3's *tests* run at 0.73, while every *hazards* run ended inside 0.75 to 1.25. The question read it as the rule overestimating gaps and tests runs.

**What the transcripts show.** I ran `tools/ledger.py usage --breakdown` on the three runs and on the four hazards runs of U2 and U3. A run's final size is exactly its first request plus the input that arrived plus its own output (the three sum to the last request in every one), so each term can be checked.
- *The base was 12,000 to 15,000 too high in most of them, by accident.* The rules of `crates/**` attach only when the Read, Write or Edit tool touches a path under `crates/`; the verifiers read code with `sed` and `grep`, so whether a run got the rules depended on whether it happened to use Read once. Over the thirteen verifier runs of this step, six had no rule of `crates/**` in context: U1's hazards of the other groups, U2's hazards of `EditorSelection`, both U2 gaps runs, U3's tests, U3's hazards of `RangeSet`. Those runs judged D11 to D15 from rows they grepped (a row of the table is one line, so the grep gave its whole text, but only of the rules they thought to look up). That is a defect of the card, not of the estimate: a verifier must judge against all the rules, so the card now names a file to Read first, and the base is then always the one the rule assumes.
- *Gaps runs read little and think much.* The `change.rs` gaps run added 41,450 tokens of input and wrote 50,020 of its own (1.21 times); the `selection.rs` run 29,484 and 16,574 (0.56). They read code by the lines a mutant or an outcome names, never the test files the estimate had counted whole. So their cost follows the number of mutants and outcomes, not the bytes of the files those sit in: fitted on the two runs, about 27,000 of fixed reading beyond the base, about 4,000 per mutant and 3,000 per branch outcome, which reproduces both runs within 2,000. Two runs fit three numbers loosely; the fit is a starting point for U3's first part, which is its pilot.
- *Tests runs were right but for the base and their own factor.* Their own work was 0.38 and 0.36 of what they read, not 0.45; with the rules counted and that factor, the rule gives 1.07 and 1.15 for the two tests runs.
- *Hazards runs were estimated per hazard already* (the orchestrator's figure from U1's two pilots) and ended between 0.98 and 1.22; their own factor ranged 0.30 to 0.65.

**Decision.**
1. *The base is made true, not lowered:* every verifier assignment's first Read is `crates/ferrum-state/src/lib.rs`, so the rules load once in every run (`cards/verifier.md` "Sources"); `README.md` §5 says that path rules load only through those tools.
2. *The rule is calibrated by kind* (`README.md` §5): the own-work factor is the kind's, and a run whose work is a count of like units read in parts is a fixed part plus a figure per unit, both from finished runs of that kind, the first such run being the pilot. For this stage: tests 1.37 times what they read; hazards as before; gaps 25,000 of base, 27,000 fixed, 4,000 per mutant, 3,000 per outcome or line, 15,000 per G5 mismatch (not yet measured).
3. *U3's gaps*, about 240,000 by that rule, run as three parts by region of `rangeset.rs` (about 107,000, 110,000 and 126,000), so that a mutant and the outcomes on the same lines are read in the same run; part A is the pilot of the other two. U4a's and U4b's gaps run as one, about 136,000. The plan's figure for U3's gaps, 130,000, came from M27's byte rule; scaling it down by the factor the question saw would have put U3's gaps near 90,000 against a likely 240,000: the error was the term, not a scale.
4. *The runs without the rules:* their verdicts stand as written; the sixth verifier draws its sample per run, each run's lines at least in their share, so that those six runs are re-checked by a context that has the rules (`plan.md` step 4).

**Lost.** Scaling the estimate of gaps and tests runs by 0.7 (it fits the three runs and fails on U3, whose mutants are two and a half times U2's); lowering the base to what the runs got (it would make an accident the rule); dropping the 140,000 split for gaps because U3's two hazards runs above it finished whole (they did, at 1.0 and 1.2 of good estimates; the split's reason was runs that drop parts when their estimate is wrong, and the gaps estimate is the least measured one now).

**Confidence.** High on the diagnosis: every term is read from the transcripts and sums exactly. Medium on the per-unit figures: two runs, and `rangeset.rs`'s cursors may cost more per mutant than `change.rs`. **Reopens.** U3's part A outside 0.75 to 1.25 of 107,000 (its breakdown then gives the figures for B and C), or a verifier run whose breakdown shows no rule of `crates/**` loaded.

## 2026-11-26 · M29: what a hazards run's own work follows, and how U4b's hazards runs are cut

*Decided by the consultant (M29, raised by the orchestrator at step 3 of the conformance of `ferrum-state`; observation W55, corrected). Binding text: `docs/workflow/README.md` §5 "Budgets"; `docs/parity/ferrum-state/plan.md` "Conformance" step 3 ("Hazards runs after M29"); `docs/parity/ferrum-state/cards/verifier.md` ("Budget"); `tools/ledger.py` (`breakdown`). Ledger: E56 (its hazards part refuted), E57, E58.*

**Question.** U4a's two hazards runs ended at 1.32 times their estimates (227,016 against 172,000; 242,302 against 183,000), where the six before ended at 0.98 to 1.22. The question asked what the rule's base is now that every run loads the rules of `crates/**`, and whether a run's cost per hazard grows with the number of hazards it holds.

**What the eight transcripts show.** I ran `tools/ledger.py usage --breakdown` on all eight hazards runs (U1 `a5caab05dbf52b41a`, `a79ba54ecec17f6e0`; U2 `a3d0d74ef05219df2`, `a95b2cb1f6324dc80`; U3 `a56dabdc32dbaa825`, `a17c6facdceec27d7`; U4a `afa5fbf2b46c1d66e`, `acae4faaa02241732`), read each assignment's budget, and sorted every tool result by what it read.
- *The rule used was not the one the plan names.* The plan said hazards runs are "a fixed part plus the tokens per hazard"; every assignment computed M27's byte rule instead (base 27,000 plus 1.45 times the named files at 2.3 bytes per token and 30,000 of lookups), and quoted the per-hazard figure beside it. So no rule tied the estimate to the number of lines a run writes.
- *Own work follows the lines written, not the reading.* Own output was 39,547 to 88,716 tokens; against the verdict lines each run wrote (59 to 185: hazard, panic, shared, sentinel, item), a line fits it at about 28,000 plus 324 a line, within 10% on six runs and 16,000 on the other two. Against reading it does not fit (U4a's two runs read about the same and wrote 81 and 150 lines; their own output was 59,354 and 79,252). This is why the error showed now: a factor of reading is right only for runs whose lines are proportional to their reading, which the earlier runs roughly were.
- *Reading beyond the named files was about 50,000, not 30,000:* what remains of each run's input after its first request, its rules and the named files ranges from 30,000 to 74,000 (the `Facet` run's lookups into decision records, fixtures and the tool's own code were the largest).
- *No growth per hazard.* The run with the most lines (U3's other groups, 185) sits on the same line as the rest; nothing in the eight shows a cost per line that rises with their number.
- *The rules question.* The base is first request (about 11,000) plus the rules (40,973 bytes, about 17,600 tokens at the measured 0.43): about 28,600, where M28's text said 25,000. W55 said four of the six earlier runs lacked the rules; the breakdowns show three (U1's other groups, U2's `EditorSelection`, U3's `RangeSet`), corrected in `learnings.md`.
- *A defect of the breakdown tool:* a transcript can log a tool result twice (3 or 4 results of a run; the U1 `Text` run's 61,000 characters counted double), which inflated `results_chars_by_tool`; the size figures, read from usage, were right. Fixed: a result is counted once per `tool_use_id`, tried on two transcripts (258,421 and 299,723 characters, the distinct totals).

**Decision.**
1. *A hazards run's estimate* is 57,000 (first request, rules, the fixed part of own work) plus its named files at 2.3 bytes per token, plus 50,000 for card and lookups, plus 330 per verdict line it will write. On the eight runs, with the rules counted in every one, it gives 0.90 to 1.12 of what they ended at. The README states the principle (a verdict-writing run's own work is a fixed part plus a figure per line); the plan holds the figures.
2. *Cutting a hazards run.* M27's 140,000 line cannot be met by a hazards run, whose fixed part (base, module, hazards, lookups) is about 180,000 before its first line; a further cut only repeats that part. Such a run is cut so that its estimate stays within the largest run of its kind that finished whole (242,302), by item group, then by member (the second segment of a behavior id whole). Eight runs above 140,000 finished whole, with every line counted by the check, so the line's own reason (runs that drop parts) is met by the count; what is not measured is whether verdicts late in a long context are thinner, which E58 measures from the sixth verifier's sample.
3. *U4b's hazards*, 237 hazards on 66 sampled items with 81 list entries and the replayer read, about 1.6 times U4a, run as three: (H1) the member `EditorState` and the group `EditorStateConfig`, 129 lines, about 227,000; (H2) the members `EditorState^…`, `Transaction` and `TransactionSpec`, 138 lines, about 228,000; (H3) the small groups, every list entry of U4b's three modules and the replayer read, about 120 lines, about 206,000. The lists go to H3 rather than to the run that reads each module, because with them H1 would come to about 238,000, at the edge of what has been measured. `conf_check hazards` gains `--members` for the cut.

**Lost.** *Scale the old rule by 1.32* (it fits U4a and over-budgets the runs that write few lines by a quarter or more: U1's `Text` run by 1.25, U3's `RangeSet` run by 1.35). *Keep two U4b runs* (each near 330,000, past anything measured, and a stopped run is not resumed). *Four or more U4b runs to stay near 140,000* (impossible: the fixed part alone is above it; each run adds about 180,000 of reading for no gain in evidence). *A per-hazard figure without lines* (list entries and item lines cost the same as hazard lines, and the U4a run with 55 list entries is the one the per-hazard figure missed most).

**Confidence.** High on the diagnosis (each term from transcripts, the fit tried on all eight). Medium on the figures for U4b: `state.rs` and `transaction.rs` are new material, and the member cut is new. **Reopens.** A U4b hazards run outside 0.8 to 1.2 of its estimate (E57), or the sixth verifier overturning more verdicts in the runs that ended above 200,000 than in the others (E58).

## 2026-11-26 · M30: what the re-check of conformance verdicts samples, and what it costs

*Decided by the consultant (M30, raised by the orchestrator before step 4 of the conformance of `ferrum-state`; observation W56). Binding text: `docs/workflow/conformance.md` §3; `docs/workflow/README.md` §5 "Budgets"; `docs/parity/ferrum-state/plan.md` "Conformance" step 4; `docs/parity/ferrum-state/cards/verifier.md` "Step 4". The crate's part (the items tool, Q143): `docs/decisions/ferrum-state.md`, "Q143, and the item verdicts". Ledger: E56 settled, E59, E60.*

**Question.** Step 4's sixth verifier had 150,000 tokens, set on 2026-11-19, for re-checking a tenth of step 3's verdicts drawn per run; step 3 wrote 1,627 lines in 24 runs, and every cost rule measured since (M27 to M29) puts 171 re-checks at four to five times that.

**What the sample is for.** I started from what a wrong verdict of step 3 does. A wrong *finding* shows: I read every finding before the verdict (plan step 5), and the round that fixes it runs the gates again. A wrong *pass* (a hazard called exercised by a check that does not reach its case, a mutant called equivalent, a test called equivalent that asserts less, an outcome called unreachable) shows nowhere: every later gate compares against it. So the re-check is a measurement of how often the passes are wrong, by kind and by run, and its consequence is `conformance.md` §3's: one overturned pass starts the correction of its class on every line of that kind. The tenth of the brief is a proxy; what the sample needs is enough lines per kind for a class of error to show. Three things follow from that, and each changes the draw.
- *Findings leave the pool* (187 lines). Re-checking them repeats my reading at step 5.
- *Item lines leave the pool* (186 that pass). An item's verdict is defined by its behaviors' lines, its rows and the gates (`conformance.md` §0); that is data, so a tool derives every item's verdict and prints where a recorded `item` line disagrees, instead of an agent re-reading 25 of them. Q143 showed why it matters: two verifiers synthesized the same rule two ways.
- *`replayer:core` leaves the pool*: the exhaustive control run of step 1 (207,929 altered paths, none still passing) shows mechanically what that reading asserted.

That leaves 1,253 lines. Per run, 10% (the M28 reason for drawing per run stands); 20% of the six runs that judged without the rules of `crates/**`; 30% of the hazard, panic, shared and sentinel lines of the other runs that ended below 200,000, because at 10% E58 would compare 74 lines from long runs with 13 from short ones; then every kind topped up to 10 lines. A trial of the rule on the files at 658d643 gives about 200 lines: hazard 107, test 29, sentinel 22, shared 12, mutant, branch and panic 10 each. A class of error that is 5% of its kind is then found with probability above 0.99 among hazards, about 0.77 among tests and 0.40 to 0.68 in the small kinds; the verdict states those figures rather than a single rate.

**How a re-check reads.** The re-checker derives each verdict from the sources step 3's verifier had (the tool puts them beside each drawn line) before it reads the recorded line, and only then compares and re-runs what settles a difference. A checking worker gets the purpose and the sources, never the reasoning it checks (`README.md` §5 "Context"); a re-check that reads "exercised by F0345" first tends to confirm F0345. It costs more per line than a confirmation and gives a measurement that means something. What each kind's re-check re-runs is in the plan: a test, a probe through `mutant-probe`, a probe on cm6, an input for an outcome. Most lines have no `repro` to re-run (the field is for findings), which is why the brief's "re-runs their reproductions" could not be followed literally.

**What a tool does first.** I tried, on all 1,627 lines, whether the citations resolve: 2,050 fixture citations, none to a fixture that does not exist; every test name exists but one cited by a truncated prefix. The mechanical half finds almost nothing here; what remains is judgment, which is why the sample is not made smaller by a tool. The citation check is kept in the tool anyway, since it costs nothing and protects later crates; and the counting of results (by kind, by run, for the M28 runs, above and below 200,000) is the tool's, from rows the re-checker writes, not prose in `verification.md`.

**What it costs.** No new principle was missing: `README.md` §5 already says a run whose work is a count of like units read in parts is a fixed part plus a figure per unit, the first run of a kind its pilot. The figures are the gaps runs' (about 50,000 fixed; 3,000 a hazard or outcome, 3,500 a test, 4,000 a mutant with its probe, 2,500 a list entry) until U2's run, the pilot, measures this kind. One run per unit, so that lines on one module share their reading; U1, whose draw is the largest (61 lines, mostly from its short hazards runs), in two by kind. Each run stays within about 185,000: a re-check's fixed part is small, so the 140,000 line would only add fixed parts, while staying under 200,000 keeps the re-check out of the regime E58 is measuring. In all about 0.9 million, six runs.

**E56.** Settled as *revised*. Every verifier run after M28 had the rules of `crates/**` in its breakdown; the tests rule held (U4a 0.80, U4b 0.88); the gaps rule held per mutant and per outcome (parts B 1.03 and C 0.97, the U4 gaps run 0.86). Its hazards part was refuted earlier and replaced by M29 (E57, confirmed). Part A's 1.29 is its one G5 mismatch: the rule gave it 15,000, unmeasured, and the run ended 30,818 above an estimate whose other terms parts B and C bear out, so a G5 mismatch cost about 46,000, measured once; the plan says so.

**Two facts in the question, corrected.** 60726ac and 1d41c6e are two runs, not one resumed: the ledger records the first as stopped at the usage limit and not resumed, the second as a fresh run from the unit's file; the tool's 24 runs are right. And the six runs of M28 were cited by name in the plan but not by commit; the plan now names their commits.

**Lost.**
- *Keep 150,000 and re-check what fits* (about 30 lines): two to four lines a kind, which finds a class of error only if it is common, and a pass nobody re-reads is the silent case.
- *One run of 171 lines*: about 0.6 million in one context, past anything measured.
- *Sample findings as well*: it repeats step 5's reading, where every finding is read and a wrong one shows.
- *Sample item lines*: 25 agent readings of what a tool derives for all 220.
- *Let the re-checker read the recorded line first*: cheaper, and a measurement of agreement with the line rather than of the line's correctness.
- *Weight E58 no further*: E58 decides how long ferrum-view's hazards runs may be, whose modules are several times larger; 13 lines in the comparison group answer nothing.

**Confidence.** High on what the pool holds and why. Medium on the figures per line, which are the gaps runs' until the pilot. Low on what E58 can resolve: about 77 lines against 41, so only a difference of about three times or more shows, and the record of the result will say so. **Reopens.** The pilot outside 0.8 to 1.2 of its estimate (E59); an overturned pass in a kind the sample drew 10 times (its class is then read whole, and the size of the small kinds is reconsidered for `ferrum-view`).
