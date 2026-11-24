#!/bin/bash
# G5's sensitivity: one deliberate deviation per chunk, in a copy reading the attributed decisions; each run must
# report mismatches beyond the two cases no decision covers (text S7.F7168, rangeset S57.F5063).
cd /ferrum
S=/ferrum/.scratch/conformance/seed; SRC=$S/crates/ferrum-state/src; OUT=/ferrum/docs/parity/ferrum-state/conformance/g5/sensitivity.txt
: > $OUT
run() { # name file old new
  git -C $S checkout -q -- crates
  python3 - "$SRC/$2" "$3" "$4" <<'PY'
import sys
p,a,b=sys.argv[1:]; s=open(p).read(); assert s.count(a)==1, (p,a); open(p,'w').write(s.replace(a,b))
PY
  echo "== $1: $2: \`$3\` -> \`$4\`" >> $OUT
  python3 tools/oracle_fresh.py ferrum-state --replay-only --root $S 2>&1 | grep -E "replay of new cases|mismatch or pending|checks passed" | cut -c1-400 >> $OUT
}
run "change: an assoc sign in map_pos" change.rs "if end_a > pos || end_a == pos && assoc < 0 && len == 0 {" "if end_a > pos || end_a == pos && assoc > 0 && len == 0 {"
run "facet: a deduplication dropped" facet.rs "                if known <= prec {
                    return;
                }" "                if known <= prec && false {
                    return;
                }"
run "rangeset: a side order flipped in the sort" rangeset.rs "a.from.cmp(&b.from).then_with(|| a.value.start_side().cmp(&b.value.start_side()))" "a.from.cmp(&b.from).then_with(|| b.value.start_side().cmp(&a.value.start_side()))"
run "text: the cluster rule's ZWJ case" char.rs "if prev == ZWJ || next == ZWJ ||" "if next == ZWJ ||"
run "state: the merge of sequential specs" transaction.rs "        map_for_a = b.changes.desc();" "        map_for_a = ChangeSet::empty(b.changes.length()).desc();"
git -C $S checkout -q -- crates
echo "== done" >> $OUT
