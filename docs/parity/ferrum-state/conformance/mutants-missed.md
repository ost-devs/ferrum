# Mutants no check killed, ferrum-state (tools/conf_check.py mutants-missed)

Each `missed` mutant goes to its unit's verifier: a behavior no check forbids (a finding, with the input that shows the
difference) or a mutant equivalent to the code (with the reason). A `timeout` made the test run exceed cargo mutants'
limit; it is listed apart, as the run reported it.

## missed (84)

### U1 text: `crates/ferrum-state/src/text.rs` (26)
- `src/text.rs:82:42` replace > with >= in append_text  
  `let piece: Arc<str> = if end > to || pos < from {`
- `src/text.rs:82:54` replace < with <= in append_text  
  `let piece: Arc<str> = if end > to || pos < from {`
- `src/text.rs:84:32` replace > with >= in append_text  
  `let b = if end > to { to - pos } else { line.len() };`
- `src/text.rs:149:24` replace > with < in Chunker::add  
  `if child_lines > self.max_chunk`
- `src/text.rs:149:24` replace > with == in Chunker::add  
  `if child_lines > self.max_chunk`
- `src/text.rs:149:24` replace > with >= in Chunker::add  
  `if child_lines > self.max_chunk`
- `src/text.rs:155:31` replace > with >= in Chunker::add  
  `} else if child_lines > self.min_chunk && (self.current_lines > self.min_chunk || self.current_lines == 0) {`
- `src/text.rs:155:71` replace > with < in Chunker::add  
  `} else if child_lines > self.min_chunk && (self.current_lines > self.min_chunk || self.current_lines == 0) {`
- `src/text.rs:155:71` replace > with == in Chunker::add  
  `} else if child_lines > self.min_chunk && (self.current_lines > self.min_chunk || self.current_lines == 0) {`
- `src/text.rs:155:71` replace > with >= in Chunker::add  
  `} else if child_lines > self.min_chunk && (self.current_lines > self.min_chunk || self.current_lines == 0) {`
- `src/text.rs:158:84` replace > with >= in Chunker::add  
  `} else if let (Tree::Leaf(leaf), true) = (&*child.node, self.current_lines > 0)`
- `src/text.rs:163:32` replace += with *= in Chunker::add  
  `self.current_lines += child_lines;`
- `src/text.rs:164:30` replace += with *= in Chunker::add  
  `self.current_len += leaf.length + 1;`
- `src/text.rs:164:45` replace + with * in Chunker::add  
  `self.current_len += leaf.length + 1;`
- `src/text.rs:164:45` replace + with - in Chunker::add  
  `self.current_len += leaf.length + 1;`
- `src/text.rs:167:43` replace + with * in Chunker::add  
  `let length = last_leaf.length + 1 + leaf.length;`
- `src/text.rs:167:43` replace + with - in Chunker::add  
  `let length = last_leaf.length + 1 + leaf.length;`
- `src/text.rs:167:47` replace + with * in Chunker::add  
  `let length = last_leaf.length + 1 + leaf.length;`
- `src/text.rs:170:49` replace > with >= in Chunker::add  
  `if self.current_lines + child_lines > self.chunk {`
- `src/text.rs:207:26` replace << with >> in node_from  
  `max_chunk: chunk << 1,`
- `src/text.rs:579:79` replace | with ^ in Text::decompose  
  `open & ((if pos <= from { OPEN_FROM } else { 0 }) | (if end >= to { OPEN_TO } else { 0 }));`
- `src/text.rs:579:89` replace >= with < in Text::decompose  
  `open & ((if pos <= from { OPEN_FROM } else { 0 }) | (if end >= to { OPEN_TO } else { 0 }));`
- `src/text.rs:614:33` replace < with <= in Text::replace_inner  
  `if text.lines() < node.lines {`
- `src/text.rs:624:52` replace > with >= in Text::replace_inner  
  `&& updated.lines() > (total_lines >> (BRANCH_SHIFT + 1))`
- `src/text.rs:628:69` replace - with + in Text::replace_inner  
  `return Text::node(copy, node.length - (to - from) + text.len());`
- `src/text.rs:647:74` replace | with ^ in Text::replace_general  
  `text.decompose(0, text.len() as isize, &mut parts, OPEN_FROM | OPEN_TO);`

### U2 change: `crates/ferrum-state/src/change.rs` (12)
- `src/change.rs:634:28` replace > with >= in ChangeSet::filter  
  `if ins > 0 {`
- `src/change.rs:650:46` delete - in ChangeSet::filter  
  `let ins = if iter.ins == -1 {`
- `src/change.rs:651:25` delete - in ChangeSet::filter  
  `-1`
- `src/change.rs:879:31` delete - in map_set  
  `let mut inserted: isize = -1;`
- `src/change.rs:881:35` replace || with && in map_set  
  `if a.done() && b.len != 0 || b.done() && a.len != 0 {`
- `src/change.rs:889:23` replace < with <= in map_set  
  `&& (a.ins < 0 || inserted == a.i as isize || a.off == 0 && (b.len < a.len || b.len == a.len && !before))`
- `src/change.rs:918:47` replace < with <= in map_set  
  `} else if b.ins == 0 && b.len < left {`
- `src/change.rs:1050:21` replace < with <= in SectionIter<'a>::len2  
  `if self.ins < 0 { self.len } else { self.ins }`
- `src/change.rs:1067:18` replace >= with < in SectionIter<'a>::text_bit  
  `if index >= self.inserted.len() as isize && len == 0 {`
- `src/change.rs:1067:50` replace && with || in SectionIter<'a>::text_bit  
  `if index >= self.inserted.len() as isize && len == 0 {`
- `src/change.rs:1067:57` replace == with != in SectionIter<'a>::text_bit  
  `if index >= self.inserted.len() as isize && len == 0 {`
- `src/change.rs:1079:22` replace += with -= in SectionIter<'a>::forward  
  `self.off += len;`

### U2 change: `crates/ferrum-state/src/selection.rs` (1)
- `src/selection.rs:352:76` replace < with <= in EditorSelection::create  
  `if if range.is_empty() { range.from <= pos } else { range.from < pos } {`

### U3 rangeset: `crates/ferrum-state/src/rangeset.rs` (29)
- `src/rangeset.rs:151:9` replace RangeComparator::bound_change with ()  
  `let _ = pos;`
- `src/rangeset.rs:352:9` replace Chunk<T>::touch with ()  
  `#[cfg(feature = "__test")]`
- `src/rangeset.rs:451:38` replace || with && in Chunk<T>::map  
  `if new_from > new_to || new_from == new_to && start_side > 0 && end_side <= 0 {`
- `src/rangeset.rs:482:79` replace - with / in Chunk<T>::map  
  `if or(new_from - (from[j - 1] + new_pos), || end_side - value[j - 1].start_side() as i64) > 0 {`
- `src/rangeset.rs:482:115` replace > with >= in Chunk<T>::map  
  `if or(new_from - (from[j - 1] + new_pos), || end_side - value[j - 1].start_side() as i64) > 0 {`
- `src/rangeset.rs:640:36` replace < with <= in RangeSet<T>::update_inner  
  `&& cur.chunk_index < this.chunk.len()`
- `src/rangeset.rs:692:59` delete - in RangeSet<T>::map  
  `chunk_pos.push(changes.map_pos(start, -1));`
- `src/rangeset.rs:700:35` delete - in RangeSet<T>::map  
  `_ => (-1, -1),`
- `src/rangeset.rs:788:57` replace > with == in RangeSet<T>::compare  
  `let keep = |set: &&RangeSet<T>| set.max_point() > 0 || !set.is_empty() && set.max_point() >= min_point_size;`
- `src/rangeset.rs:788:57` replace > with >= in RangeSet<T>::compare  
  `let keep = |set: &&RangeSet<T>| set.max_point() > 0 || !set.is_empty() && set.max_point() >= min_point_size;`
- `src/rangeset.rs:879:78` replace > with >= in RangeSet<T>::spans  
  `return (open_ranges + if cursor.point.is_some() && cursor.to > to { 1 } else { 0 }) as usize;`
- `src/rangeset.rs:1081:50` replace + with * in RangeSetBuilder<T>::add_chunk  
  `self.last_from = chunk.from[last] as i64 + from_i;`
- `src/rangeset.rs:1081:50` replace + with - in RangeSetBuilder<T>::add_chunk  
  `self.last_from = chunk.from[last] as i64 + from_i;`
- `src/rangeset.rs:1082:46` replace + with - in RangeSetBuilder<T>::add_chunk  
  `self.last_to = chunk.to[last] as i64 + from_i;`
- `src/rangeset.rs:1147:55` delete - in find_shared_chunks  
  `Some(diff) => diff.map_pos(known, -1),`
- `src/rangeset.rs:1150:41` replace + with - in find_shared_chunks  
  `let end = (known as i64 + l.chunk[i].length()) as usize;`
- `src/rangeset.rs:1152:21` replace && with || in find_shared_chunks  
  `&& text_diff.is_none_or(|d| d.touches_range(known, end) == TouchesRange::False)`
- `src/rangeset.rs:1229:45` replace < with <= in LayerCursor<T>::goto_inner  
  `if !forward || self.range_index < range_index {`
- `src/rangeset.rs:1315:39` replace >> with << in HeapCursor<T>::goto  
  `for i in (0..=self.heap.len() >> 1).rev() {`
- `src/rangeset.rs:1325:39` replace >> with << in HeapCursor<T>::forward  
  `for i in (0..=self.heap.len() >> 1).rev() {`
- `src/rangeset.rs:1394:88` delete - in CursorKind<T>::from_sets  
  `CursorKind::Heap(HeapCursor { heap, layers, from: 0, to: 0, value: None, rank: -1 })`
- `src/rangeset.rs:1499:31` replace > with < in SpanCursor<T>::forward  
  `while self.min_active > -1 && {`
- `src/rangeset.rs:1499:33` delete - in SpanCursor<T>::forward  
  `while self.min_active > -1 && {`
- `src/rangeset.rs:1501:34` replace - with + in SpanCursor<T>::forward  
  `or(self.active_to[m] - pos, || self.active[m].end_side() as i64 - side) < 0`
- `src/rangeset.rs:1609:34` replace > with >= in SpanCursor<T>::active_for_point  
  `if self.active_to[i] > to || self.active_to[i] == to && self.active[i].end_side() >= point_end_side {`
- `src/rangeset.rs:1609:66` replace && with || in SpanCursor<T>::active_for_point  
  `if self.active_to[i] > to || self.active_to[i] == to && self.active[i].end_side() >= point_end_side {`
- `src/rangeset.rs:1650:27` replace < with <= in compare  
  `let end = if diff < 0 { a.to + d_pos } else { b.to };`
- `src/rangeset.rs:1710:22` replace < with > in find_min_index  
  `if found < 0 { 0 } else { value[i].end_side() as i64 - value[found as usize].end_side() as i64 }`
- `src/rangeset.rs:1712:17` replace < with <= in find_min_index  
  `if diff < 0 {`

### U4 state: `crates/ferrum-state/src/facet.rs` (7)
- `src/facet.rs:110:72` delete field is_static from struct FacetConfig expression  
  `let init_field = Facet::define_with_id(builtin_id(), FacetConfig { is_static: true, ..FacetConfig::default() });`
- `src/facet.rs:699:62` replace == with != in StateField<T>::define  
  `let eq: ErasedCompare = Box::new(|a, b| down::<T>(a) == down::<T>(b));`
- `src/facet.rs:1111:69` replace | with ^ in Configuration::resolve  
  `address.insert(facet.id, (static_values.len() << 1) | 1);`
- `src/facet.rs:1138:25` delete match arm ProviderValue::Static(value) in Configuration::resolve  
  `ProviderValue::Static(value) => {`
- `src/facet.rs:1139:77` replace | with ^ in Configuration::resolve  
  `address.insert(p.id, (static_values.len() << 1) | 1);`
- `src/facet.rs:1289:27` replace | with ^ in ensure_addr  
  `let status = COMPUTED | changed;`
- `src/facet.rs:1440:65` replace || with && in provider_slot  
  `(Some(a), Some(b)) => Arc::ptr_eq(a, b) || (field.inner.eq)(&**a, &**b),`

### U4 state: `crates/ferrum-state/src/state.rs` (4)
- `src/state.rs:157:13` delete field effects from struct TransactionSpec expression in <impl From<ChangeByRange> for TransactionSpec>::from  
  `effects: result.effects,`
- `src/state.rs:661:9` replace EditorState::end_construction with ()  
  `*self.inner.building.lock().unwrap_or_else(PoisonError::into_inner) = None;`
- `src/state.rs:719:21` delete match arm ExtensionKind::List(list) in EditorState::apply_transaction  
  `ExtensionKind::List(list) => list.clone(),`
- `src/state.rs:723:21` delete match arm ExtensionKind::List(more) in EditorState::apply_transaction  
  `ExtensionKind::List(more) => list.extend(more.iter().cloned()),`

### U4 state: `crates/ferrum-state/src/transaction.rs` (5)
- `src/transaction.rs:303:13` delete field selection from struct TransactionSpec expression in <impl From<&Transaction> for TransactionSpec>::from  
  `selection: tr.selection.clone().map(SelectionSpec::Selection),`
- `src/transaction.rs:304:13` delete field effects from struct TransactionSpec expression in <impl From<&Transaction> for TransactionSpec>::from  
  `effects: tr.effects.clone(),`
- `src/transaction.rs:306:13` delete field scroll_into_view from struct TransactionSpec expression in <impl From<&Transaction> for TransactionSpec>::from  
  `scroll_into_view: tr.scroll_into_view,`
- `src/transaction.rs:509:19` delete - in now  
  `Err(e) => -(e.duration().as_millis() as i64),`
- `src/transaction.rs:632:26` replace < with <= in join_ranges  
  `if *last < to {`

## timeout (72)

### U1 text: `crates/ferrum-state/src/char.rs` (7)
- `src/char.rs:84:24` replace + with * in is_extending_char  
  `from = mid + 1;`
- `src/char.rs:84:24` replace + with - in is_extending_char  
  `from = mid + 1;`
- `src/char.rs:124:5` replace cluster_break -> usize with 0  
  `if forward { next_cluster_break(s, pos, include_extending) } else { prev_cluster_break(s, pos, include_extending) }`
- `src/char.rs:124:5` replace cluster_break -> usize with 1  
  `if forward { next_cluster_break(s, pos, include_extending) } else { prev_cluster_break(s, pos, include_extending) }`
- `src/char.rs:131:5` replace next_cluster_break -> usize with 0  
  `if pos == s.len() {`
- `src/char.rs:155:17` replace += with -= in next_cluster_break  
  `pos += next.len_utf8();`
- `src/char.rs:174:25` replace - with / in prev_cluster_break  
  `let start = end - c.len_utf8();`

### U1 text: `crates/ferrum-state/src/column.rs` (2)
- `src/column.rs:31:15` replace += with *= in count_column  
  `i += 1;`
- `src/column.rs:31:15` replace += with -= in count_column  
  `i += 1;`

### U2 change: `crates/ferrum-state/src/change.rs` (33)
- `src/change.rs:620:27` replace < with <= in ChangeSet::filter  
  `while pos < next || pos == next && iter.len == 0 {`
- `src/change.rs:620:27` replace < with == in ChangeSet::filter  
  `while pos < next || pos == next && iter.len == 0 {`
- `src/change.rs:620:27` replace < with > in ChangeSet::filter  
  `while pos < next || pos == next && iter.len == 0 {`
- `src/change.rs:620:34` replace || with && in ChangeSet::filter  
  `while pos < next || pos == next && iter.len == 0 {`
- `src/change.rs:620:49` replace && with || in ChangeSet::filter  
  `while pos < next || pos == next && iter.len == 0 {`
- `src/change.rs:620:61` replace == with != in ChangeSet::filter  
  `while pos < next || pos == next && iter.len == 0 {`
- `src/change.rs:644:27` replace < with <= in ChangeSet::filter  
  `while pos < end {`
- `src/change.rs:796:25` replace += with -= in add_section  
  `sections[n - 1] += ins;`
- `src/change.rs:888:25` replace >= with < in map_set  
  `} else if b.ins >= 0`
- `src/change.rs:889:13` replace && with || in map_set  
  `&& (a.ins < 0 || inserted == a.i as isize || a.off == 0 && (b.len < a.len || b.len == a.len && !before))`
- `src/change.rs:889:27` replace || with && in map_set  
  `&& (a.ins < 0 || inserted == a.i as isize || a.off == 0 && (b.len < a.len || b.len == a.len && !before))`
- `src/change.rs:889:39` replace == with != in map_set  
  `&& (a.ins < 0 || inserted == a.i as isize || a.off == 0 && (b.len < a.len || b.len == a.len && !before))`
- `src/change.rs:889:55` replace || with && in map_set  
  `&& (a.ins < 0 || inserted == a.i as isize || a.off == 0 && (b.len < a.len || b.len == a.len && !before))`
- `src/change.rs:893:23` replace != with == in map_set  
  `while len != 0 {`
- `src/change.rs:910:25` replace >= with < in map_set  
  `} else if a.ins >= 0 {`
- `src/change.rs:912:24` replace != with == in map_set  
  `while left != 0 {`
- `src/change.rs:913:26` replace == with != in map_set  
  `if b.ins == -1 {`
- `src/change.rs:913:29` delete - in map_set  
  `if b.ins == -1 {`
- `src/change.rs:960:25` replace == with != in compose_sets  
  `} else if a.ins == 0 {`
- `src/change.rs:964:30` replace && with || in compose_sets  
  `} else if b.len == 0 && !b.done() {`
- `src/change.rs:964:33` delete ! in compose_sets  
  `} else if b.len == 0 && !b.done() {`
- `src/change.rs:971:28` replace || with && in compose_sets  
  `} else if a.done() || b.done() {`
- `src/change.rs:1034:9` replace SectionIter<'a>::next with ()  
  `if self.i < self.sections.len() {`
- `src/change.rs:1037:20` replace += with *= in SectionIter<'a>::next  
  `self.i += 2;`
- `src/change.rs:1040:24` delete - in SectionIter<'a>::next  
  `self.ins = -2;`
- `src/change.rs:1046:9` replace SectionIter<'a>::done -> bool with false  
  `self.ins == -2`
- `src/change.rs:1046:21` delete - in SectionIter<'a>::done  
  `self.ins == -2`
- `src/change.rs:1050:9` replace SectionIter<'a>::len2 -> isize with -1  
  `if self.ins < 0 { self.len } else { self.ins }`
- `src/change.rs:1050:9` replace SectionIter<'a>::len2 -> isize with 0  
  `if self.ins < 0 { self.len } else { self.ins }`
- `src/change.rs:1050:21` replace < with == in SectionIter<'a>::len2  
  `if self.ins < 0 { self.len } else { self.ins }`
- `src/change.rs:1050:21` replace < with > in SectionIter<'a>::len2  
  `if self.ins < 0 { self.len } else { self.ins }`
- `src/change.rs:1075:9` replace SectionIter<'a>::forward with ()  
  `if len == self.len {`
- `src/change.rs:1075:16` replace == with != in SectionIter<'a>::forward  
  `if len == self.len {`

### U3 rangeset: `crates/ferrum-state/src/rangeset.rs` (26)
- `src/rangeset.rs:391:26` replace + with - in Chunk<T>::find_index  
  `lo = mid + 1;`
- `src/rangeset.rs:485:27` replace -= with /= in Chunk<T>::map  
  `j -= 1;`
- `src/rangeset.rs:632:114` replace >= with < in RangeSet<T>::update_inner  
  `.is_some_and(|r| or(cur.from - r.from as i64, || cur.start_side() - r.value.start_side() as i64) >= 0);`
- `src/rangeset.rs:878:26` replace > with == in RangeSet<T>::spans  
  `if cursor.to > to {`
- `src/rangeset.rs:1219:30` replace += with *= in LayerCursor<T>::goto_inner  
  `self.chunk_index += 1;`
- `src/rangeset.rs:1229:16` delete ! in LayerCursor<T>::goto_inner  
  `if !forward || self.range_index < range_index {`
- `src/rangeset.rs:1229:45` replace < with > in LayerCursor<T>::goto_inner  
  `if !forward || self.range_index < range_index {`
- `src/rangeset.rs:1243:9` replace LayerCursor<T>::next with ()  
  `loop {`
- `src/rangeset.rs:1269:38` replace += with *= in LayerCursor<T>::set_range_index  
  `self.chunk_index += 1;`
- `src/rangeset.rs:1269:38` replace += with -= in LayerCursor<T>::set_range_index  
  `self.chunk_index += 1;`
- `src/rangeset.rs:1359:38` replace << with >> in heap_bubble  
  `let mut child_index = (index << 1) + 1;`
- `src/rangeset.rs:1359:44` replace + with * in heap_bubble  
  `let mut child_index = (index << 1) + 1;`
- `src/rangeset.rs:1359:44` replace + with - in heap_bubble  
  `let mut child_index = (index << 1) + 1;`
- `src/rangeset.rs:1364:25` replace += with -= in heap_bubble  
  `child_index += 1;`
- `src/rangeset.rs:1509:9` replace SpanCursor<T>::remove_active with ()  
  `self.active.remove(index);`
- `src/rangeset.rs:1521:15` replace += with *= in SpanCursor<T>::add_active  
  `i += 1;`
- `src/rangeset.rs:1535:9` replace SpanCursor<T>::next with ()  
  `let from = self.to;`
- `src/rangeset.rs:1547:38` replace > with == in SpanCursor<T>::next  
  `if self.active_to[a] > from {`
- `src/rangeset.rs:1547:38` replace > with >= in SpanCursor<T>::next  
  `if self.active_to[a] > from {`
- `src/rangeset.rs:1560:42` replace > with == in SpanCursor<T>::next  
  `} else if self.cursor.from() > from {`
- `src/rangeset.rs:1560:42` replace > with >= in SpanCursor<T>::next  
  `} else if self.cursor.from() > from {`
- `src/rangeset.rs:1650:38` replace + with * in compare  
  `let end = if diff < 0 { a.to + d_pos } else { b.to };`
- `src/rangeset.rs:1675:16` replace > with < in compare  
  `if end > end_b {`
- `src/rangeset.rs:1675:16` replace > with == in compare  
  `if end > end_b {`
- `src/rangeset.rs:1679:17` replace <= with > in compare  
  `if diff <= 0 {`
- `src/rangeset.rs:1682:17` replace >= with < in compare  
  `if diff >= 0 {`

### U4 state: `crates/ferrum-state/src/transaction.rs` (4)
- `src/transaction.rs:615:5` replace join_ranges -> Vec<usize> with vec![0]  
  `let mut result: Vec<usize> = Vec::new();`
- `src/transaction.rs:615:5` replace join_ranges -> Vec<usize> with vec![1]  
  `let mut result: Vec<usize> = Vec::new();`
- `src/transaction.rs:622:16` replace += with *= in join_ranges  
  `ia += 2;`
- `src/transaction.rs:626:16` replace += with *= in join_ranges  
  `ib += 2;`
