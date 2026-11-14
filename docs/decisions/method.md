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
