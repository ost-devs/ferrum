# Lists for the verifiers of ferrum-state (tools/conf_check.py lists)

## panics (G9)

### U1 text: `crates/ferrum-state/src/char.rs` (3)
- `src/char.rs:104` None => unreachable!("char_at is called before the end of the string"),
- `src/char.rs:116` panic!("Position {pos} is inside a character of the string");
- `src/char.rs:196` panic!("Position {pos} is beyond the end of a string of length {}", s.len());

### U1 text: `crates/ferrum-state/src/column.rs` (1)
- `src/column.rs:9` panic!("Invalid tab size 0");

### U1 text: `crates/ferrum-state/src/text.rs` (7)
- `src/text.rs:275` panic!("{}", Error::InvalidPosition { pos, length: self.len() });
- `src/text.rs:296` panic!("{}", Error::InvalidLineNumber { n, lines: self.lines() });
- `src/text.rs:442` panic!("{}", Error::EmptyDocument);
- `src/text.rs:479` panic!("Position {pos} is not on a character boundary of the document")
- `src/text.rs:535` unreachable!("line_inner is called with a position or line number inside the document")
- `src/text.rs:552` let Some(prev) = target.pop() else { unreachable!("an open piece follows another piece") };
- `src/text.rs:554` unreachable!("the pieces at an open seam are leaves")

### U2 change: `crates/ferrum-state/src/change.rs` (7)
- `src/change.rs:191` None => unreachable!("mapPos in MapMode.Simple always gives a position"),
- `src/change.rs:234` panic!("{}", Error::PositionOutOfRange { pos: pos as usize, length: pos_a as usize });
- `src/change.rs:368` panic!("{}", Error::ApplyWrongLength);
- `src/change.rs:521` None => unreachable!("flush(true) always sets the total"),
- `src/change.rs:702` panic!(
- `src/change.rs:716` panic!("{}", Error::InvalidChangeRange { from, to, length: self.length as usize });
- `src/change.rs:1012` panic!("{}", Error::MismatchedChangeSetLengths)

### U2 change: `crates/ferrum-state/src/selection.rs` (4)
- `src/selection.rs:281` panic!("Range index {which} is beyond the {} ranges of the selection", ranges.len())
- `src/selection.rs:345` panic!("{}", Error::EmptySelection);
- `src/selection.rs:348` panic!("Main index {main_index} is beyond the {} ranges of the selection", ranges.len());
- `src/selection.rs:509` panic!("{}", Error::SelectionOutsideDocument);

### U3 rangeset: `crates/ferrum-state/src/rangeset.rs` (2)
- `src/rangeset.rs:297` panic!("NO TOUCH");
- `src/rangeset.rs:1043` panic!("{}", Error::UnsortedRanges);

### U4 state: `crates/ferrum-state/src/config.rs` (1)
- `src/config.rs:34` None => panic!("{}", Error::ConfigMergeConflict { field: field.to_string() }),

### U4 state: `crates/ferrum-state/src/facet.rs` (9)
- `src/facet.rs:53` None => unreachable!("a slot holds the type its definition gives it"),
- `src/facet.rs:440` panic!("{}", Error::ComputeStaticFacet);
- `src/facet.rs:457` panic!("{}", Error::ComputeStaticFacet);
- `src/facet.rs:1019` None => unreachable!("every slot of a configuration has an address"),
- `src/facet.rs:1121` _ => unreachable!("every provider of this facet is static"),
- `src/facet.rs:1224` panic!("{}", Error::DuplicateCompartment);
- `src/facet.rs:1282` panic!("{}", Error::CyclicDependency);
- `src/facet.rs:1301` None => unreachable!("a slot is read after it is computed"),
- `src/facet.rs:1342` None => unreachable!("an updated slot has a value in the state it starts from"),

### U4 state: `crates/ferrum-state/src/state.rs` (5)
- `src/state.rs:201` None => panic!("{}", Error::FieldNotPresent),
- `src/state.rs:325` panic!("Field \"{prop}\" has no to_json function");
- `src/state.rs:370` None => panic!("Field \"{prop}\" has no from_json function"),
- `src/state.rs:516` Err(_) => panic!(
- `src/state.rs:668` None => unreachable!("every slot of a state is computed before its constructor returns"),

### U4 state: `crates/ferrum-state/src/transaction.rs` (1)
- `src/transaction.rs:589` None => unreachable!("applying a transaction stores its state"),


## shared state (G7)

### U1 text: `crates/ferrum-state/src/text.rs` (2)
- `src/text.rs:8` use std::sync::{Arc, LazyLock};
- `src/text.rs:43` static EMPTY: LazyLock<Text> = LazyLock::new(|| Text::leaf(vec![Arc::from("")], 0));

### U3 rangeset: `crates/ferrum-state/src/rangeset.rs` (4)
- `src/rangeset.rs:274` any: std::sync::atomic::AtomicBool,
- `src/rangeset.rs:275` state: std::sync::Mutex<MarkState>,
- `src/rangeset.rs:282` counters: Vec<Arc<std::sync::atomic::AtomicUsize>>,
- `src/rangeset.rs:312` pub(crate) fn count_reads(&self, hits: Arc<std::sync::atomic::AtomicUsize>) {

### U4 state: `crates/ferrum-state/src/extension.rs` (13)
- `src/extension.rs:6` use std::sync::{Arc, LazyLock};
- `src/extension.rs:119` pub(crate) static LANGUAGE_DATA: LazyLock<Facet<LanguageDataProvider>> =
- `src/extension.rs:120` LazyLock::new(|| BUILTINS.language_data.clone());
- `src/extension.rs:121` pub(crate) static ALLOW_MULTIPLE_SELECTIONS: LazyLock<Facet<bool, bool>> =
- `src/extension.rs:122` LazyLock::new(|| BUILTINS.allow_multiple_selections.clone());
- `src/extension.rs:123` pub(crate) static LINE_SEPARATOR: LazyLock<Facet<String, Option<String>>> =
- `src/extension.rs:124` LazyLock::new(|| BUILTINS.line_separator.clone());
- `src/extension.rs:125` pub(crate) static CHANGE_FILTER: LazyLock<Facet<ChangeFilter>> = LazyLock::new(|| BUILTINS.change_filter.clone());
- `src/extension.rs:126` pub(crate) static TRANSACTION_FILTER: LazyLock<Facet<TransactionFilter>> =
- `src/extension.rs:127` LazyLock::new(|| BUILTINS.transaction_filter.clone());
- `src/extension.rs:128` pub(crate) static TRANSACTION_EXTENDER: LazyLock<Facet<TransactionExtender>> =
- `src/extension.rs:129` LazyLock::new(|| BUILTINS.transaction_extender.clone());
- `src/extension.rs:130` pub(crate) static READ_ONLY: LazyLock<Facet<bool, bool>> = LazyLock::new(|| BUILTINS.read_only.clone());

### U4 state: `crates/ferrum-state/src/facet.rs` (38)
- `src/facet.rs:15` use std::sync::atomic::{AtomicUsize, Ordering};
- `src/facet.rs:16` use std::sync::{Arc, LazyLock, OnceLock};
- `src/facet.rs:24` pub(crate) static NEXT_ID: AtomicUsize = AtomicUsize::new(0);
- `src/facet.rs:50` pub(crate) fn down<T: 'static>(v: &AnyValue) -> &T {
- `src/facet.rs:60` LazyLock::force(&BUILTINS);
- `src/facet.rs:82` fn default_combine<I: Clone>() -> impl Fn(&[I]) -> Vec<I> + Send + Sync + 'static {
- `src/facet.rs:87` fn default_combine_type<I: Clone + 'static>() -> TypeId {
- `src/facet.rs:109` pub(crate) static BUILTINS: LazyLock<Builtins> = LazyLock::new(|| {
- `src/facet.rs:153` pub(crate) static COMPARTMENT_RECONFIGURE: LazyLock<StateEffectType<CompartmentReconfigure>> =
- `src/facet.rs:154` LazyLock::new(|| StateEffect::define(StateEffectSpec::default()));
- `src/facet.rs:230` I: Clone + PartialEq + Send + Sync + 'static,
- `src/facet.rs:231` O: PartialEq + Send + Sync + 'static,
- `src/facet.rs:243` I: Clone + PartialEq + Send + Sync + 'static,
- `src/facet.rs:244` O: PartialEq + Send + Sync + 'static,
- `src/facet.rs:290` pub(crate) extensions: OnceLock<Extension>,
- `src/facet.rs:349` pub fn new(combine: impl Fn(&[I]) -> O + Send + Sync + 'static) -> FacetConfig<I, O> {
- `src/facet.rs:378` I: Clone + PartialEq + Send + Sync + 'static,
- `src/facet.rs:379` O: PartialEq + Send + Sync + 'static,
- `src/facet.rs:410` FacetInner { id, default, is_static: config.is_static, ops: Box::new(ops), extensions: OnceLock::new() };
- `src/facet.rs:438` pub fn compute(&self, deps: &[Slot], get: impl Fn(&EditorState) -> I + Send + Sync + 'static) -> Extension {
- `src/facet.rs:455` pub fn compute_n(&self, deps: &[Slot], get: impl Fn(&EditorState) -> Vec<I> + Send + Sync + 'static) -> Extension {
- `src/facet.rs:473` pub fn from<T>(&self, field: &StateField<T>, get: impl Fn(&T) -> I + Send + Sync + 'static) -> Extension
- `src/facet.rs:475` T: PartialEq + Send + Sync + 'static,
- `src/facet.rs:551` impl<O: Send + Sync + 'static> From<&FacetReader<O>> for Slot {
- `src/facet.rs:557` impl<I, O: Send + Sync + 'static> From<&Facet<I, O>> for Slot {
- `src/facet.rs:563` impl<T: Send + Sync + 'static> From<&StateField<T>> for Slot {
- `src/facet.rs:618` pub(crate) provides: OnceLock<Extension>,
- `src/facet.rs:670` create: impl Fn(&EditorState) -> T + Send + Sync + 'static,
- `src/facet.rs:671` update: impl Fn(&T, &Transaction) -> T + Send + Sync + 'static,
- `src/facet.rs:686` T: PartialEq + Send + Sync + 'static,
- `src/facet.rs:705` FieldInner { id: new_id(), create, update, compare, eq, to_json, from_json, provides: OnceLock::new() };
- `src/facet.rs:717` pub fn init(&self, create: impl Fn(&EditorState) -> T + Send + Sync + 'static) -> Extension {
- `src/facet.rs:754` impl<T: Send + Sync + 'static> From<StateField<T>> for StateField<dyn Any + Send + Sync> {
- `src/facet.rs:760` impl<T: Send + Sync + 'static> From<&StateField<T>> for StateField<dyn Any + Send + Sync> {
- `src/facet.rs:829` impl<T: Send + Sync + 'static> From<StateField<T>> for Extension {
- `src/facet.rs:835` impl<T: Send + Sync + 'static> From<&StateField<T>> for Extension {
- `src/facet.rs:1073` pub(crate) fn static_facet<'a, O: 'static>(&'a self, facet: &'a FacetReader<O>) -> &'a O {
- `src/facet.rs:1121` _ => unreachable!("every provider of this facet is static"),

### U4 state: `crates/ferrum-state/src/state.rs` (27)
- `src/state.rs:5` use std::sync::atomic::AtomicU8;
- `src/state.rs:6` use std::sync::{Arc, LazyLock, Mutex, OnceLock, PoisonError};
- `src/state.rs:57` pub(crate) values: Vec<OnceLock<Val>>,
- `src/state.rs:59` pub(crate) status: Vec<AtomicU8>,
- `src/state.rs:62` building: Mutex<Option<Building>>,
- `src/state.rs:77` buckets: OnceLock<Box<[AbsentList; ABSENT_BUCKETS]>>,
- `src/state.rs:84` facet: OnceLock<Arc<FacetInner>>,
- `src/state.rs:85` next: OnceLock<Box<AbsentList>>,
- `src/state.rs:198` pub fn field<T: Send + Sync + 'static>(&self, field: &StateField<T>) -> &T {
- `src/state.rs:208` pub fn try_field<T: Send + Sync + 'static>(&self, field: &StateField<T>) -> Option<&T> {
- `src/state.rs:304` pub fn facet<O: Send + Sync + 'static>(&self, facet: &FacetReader<O>) -> &O {
- `src/state.rs:420` pub const ALLOW_MULTIPLE_SELECTIONS: &LazyLock<Facet<bool, bool>> = &extension::ALLOW_MULTIPLE_SELECTIONS;
- `src/state.rs:426` pub const TAB_SIZE: &LazyLock<Facet<usize, usize>> = &TAB_SIZE;
- `src/state.rs:439` pub const LINE_SEPARATOR: &LazyLock<Facet<String, Option<String>>> = &extension::LINE_SEPARATOR;
- `src/state.rs:455` pub const READ_ONLY: &LazyLock<Facet<bool, bool>> = &extension::READ_ONLY;
- `src/state.rs:468` pub const PHRASES: &LazyLock<Facet<HashMap<String, String>>> = &PHRASES;
- `src/state.rs:492` pub const LANGUAGE_DATA: &LazyLock<Facet<LanguageDataProvider>> = &extension::LANGUAGE_DATA;
- `src/state.rs:504` pub fn language_data_at<T: Send + Sync + 'static>(&self, name: &str, pos: usize, side: i8) -> Vec<Arc<T>> {
- `src/state.rs:531` pub fn char_categorizer(&self, at: usize) -> impl Fn(&str) -> CharCategory + Send + Sync + 'static + use<> {
- `src/state.rs:566` pub const CHANGE_FILTER: &LazyLock<Facet<ChangeFilter>> = &extension::CHANGE_FILTER;
- `src/state.rs:572` pub const TRANSACTION_FILTER: &LazyLock<Facet<TransactionFilter>> = &extension::TRANSACTION_FILTER;
- `src/state.rs:578` pub const TRANSACTION_EXTENDER: &LazyLock<Facet<TransactionExtender>> = &extension::TRANSACTION_EXTENDER;
- `src/state.rs:581` static TAB_SIZE: LazyLock<Facet<usize, usize>> = LazyLock::new(|| BUILTINS.tab_size.clone());
- `src/state.rs:582` static PHRASES: LazyLock<Facet<HashMap<String, String>>> = LazyLock::new(|| BUILTINS.phrases.clone());
- `src/state.rs:643` values: (0..n).map(|_| OnceLock::new()).collect(),
- `src/state.rs:644` status: (0..n).map(|_| AtomicU8::new(UNRESOLVED)).collect(),
- `src/state.rs:645` building: Mutex::new(Some(Building { mode, start_values })),

### U4 state: `crates/ferrum-state/src/transaction.rs` (31)
- `src/transaction.rs:9` use std::sync::atomic::{AtomicBool, Ordering};
- `src/transaction.rs:10` use std::sync::{Arc, LazyLock, Mutex, OnceLock, PoisonError};
- `src/transaction.rs:51` pub fn value<T: Send + Sync + 'static>(&self, ty: &AnnotationType<T>) -> Option<&T> {
- `src/transaction.rs:66` pub fn define<T: Send + Sync + 'static>() -> AnnotationType<T> {
- `src/transaction.rs:86` impl<T: Send + Sync + 'static> AnnotationType<T> {
- `src/transaction.rs:132` impl<T: Send + Sync + 'static> StateEffectType<T> {
- `src/transaction.rs:167` pub fn value<T: Send + Sync + 'static>(&self, ty: &StateEffectType<T>) -> Option<&T> {
- `src/transaction.rs:194` pub fn define<T: Send + Sync + 'static>(spec: StateEffectSpec<T>) -> StateEffectType<T> {
- `src/transaction.rs:213` pub const RECONFIGURE: &LazyLock<StateEffectType<Extension>> = &RECONFIGURE;
- `src/transaction.rs:219` pub const APPEND_CONFIG: &LazyLock<StateEffectType<Extension>> = &APPEND_CONFIG;
- `src/transaction.rs:228` static RECONFIGURE: LazyLock<StateEffectType<Extension>> =
- `src/transaction.rs:229` LazyLock::new(|| StateEffect::define(StateEffectSpec::default()));
- `src/transaction.rs:230` static APPEND_CONFIG: LazyLock<StateEffectType<Extension>> =
- `src/transaction.rs:231` LazyLock::new(|| StateEffect::define(StateEffectSpec::default()));
- `src/transaction.rs:232` static TIME: LazyLock<AnnotationType<i64>> = LazyLock::new(Annotation::define);
- `src/transaction.rs:233` static USER_EVENT: LazyLock<AnnotationType<String>> = LazyLock::new(Annotation::define);
- `src/transaction.rs:234` static ADD_TO_HISTORY: LazyLock<AnnotationType<bool>> = LazyLock::new(Annotation::define);
- `src/transaction.rs:235` static REMOTE: LazyLock<AnnotationType<bool>> = LazyLock::new(Annotation::define);
- `src/transaction.rs:320` pub(crate) doc: OnceLock<Text>,
- `src/transaction.rs:409` pub fn annotation<T: Send + Sync + 'static>(&self, ty: &AnnotationType<T>) -> Option<&T> {
- `src/transaction.rs:448` pub const TIME: &LazyLock<AnnotationType<i64>> = &TIME;
- `src/transaction.rs:454` pub const USER_EVENT: &LazyLock<AnnotationType<String>> = &USER_EVENT;
- `src/transaction.rs:460` pub const ADD_TO_HISTORY: &LazyLock<AnnotationType<bool>> = &ADD_TO_HISTORY;
- `src/transaction.rs:466` pub const REMOTE: &LazyLock<AnnotationType<bool>> = &REMOTE;
- `src/transaction.rs:498` doc: OnceLock::new(),
- `src/transaction.rs:525` builder: Mutex<Option<ThreadId>>,
- `src/transaction.rs:527` lock: Mutex<()>,
- `src/transaction.rs:532` pub(crate) state: OnceLock<EditorState>,
- `src/transaction.rs:533` done: AtomicBool,
- `src/transaction.rs:534` failed: AtomicBool,
- `src/transaction.rs:535` next: OnceLock<Box<StateCell>>,

### crate-wide: `crates/ferrum-state/src/error.rs` (1)
- `src/error.rs:162` Error::ComputeStaticFacet => f.write_str("Can't compute a static facet"),


## sentinels and their arithmetic (G7)

### U1 text: `crates/ferrum-state/src/char.rs` (2)
- `src/char.rs:56` value = value * 36 + digit as u32;
- `src/char.rs:138` if prev == ZWJ || next == ZWJ || include_extending && is_extending_char(next as u32) {

### U1 text: `crates/ferrum-state/src/text.rs` (26)
- `src/text.rs:47` text.iter().map(|l| l.len() + 1).sum::<usize>().saturating_sub(1)
- `src/text.rs:83` let a = from.saturating_sub(pos);
- `src/text.rs:195` let length = length.unwrap_or_else(|| children.iter().map(|c| c.len() + 1).sum::<usize>().saturating_sub(1));
- `src/text.rs:335` self.decompose(from as isize, to as isize, &mut parts, 0);
- `src/text.rs:544` let length = leaf.length as isize;
- `src/text.rs:548` let (a, b) = (max(0, from) as usize, to as usize);
- `src/text.rs:549` Text::leaf(slice_text(&leaf.text, a, b), (min(to, length) - max(0, from)) as usize)
- `src/text.rs:576` let end = pos + child.len() as isize;
- `src/text.rs:600` append_text(&insert.text, slice_text(&leaf.text, 0, from), 0, usize::MAX),
- `src/text.rs:602` usize::MAX,
- `src/text.rs:645` self.decompose(0, from as isize, &mut parts, OPEN_TO);
- `src/text.rs:647` text.decompose(0, text.len() as isize, &mut parts, OPEN_FROM | OPEN_TO);
- `src/text.rs:649` self.decompose(to as isize, self.len() as isize, &mut parts, OPEN_FROM);
- `src/text.rs:669` result.push_str(cut(line, from.saturating_sub(pos), to - pos));
- `src/text.rs:685` child.slice_string_into(from.saturating_sub(pos), to - pos, line_sep, result);
- `src/text.rs:736` let end = self.len() as isize - self.scan_identical(other, false) as isize;
- `src/text.rs:739` let (mut skip, mut pos) = (start as isize, start as isize);
- `src/text.rs:747` pos += a.value.as_str().len() as isize;
- `src/text.rs:1009` skip = self.value.as_str().len() as isize;
- `src/text.rs:1011` self.next_inner(skip as usize, self.dir);
- `src/text.rs:1045` let pos = if backward { text.len() as isize } else { 0 };
- `src/text.rs:1051` from: min(start, end) as isize,
- `src/text.rs:1052` to: max(start, end) as isize,
- `src/text.rs:1073` let len = value.as_str().len() as isize;
- `src/text.rs:1078` value.slice((len - limit) as usize, len as usize)
- `src/text.rs:1080` value.slice(0, limit as usize)

### U2 change: `crates/ferrum-state/src/change.rs` (36)
- `src/change.rs:72` self.sections.iter().step_by(2).sum::<isize>() as usize
- `src/change.rs:79` self.sections.chunks_exact(2).map(|s| if s[1] < 0 { s[0] } else { s[1] }).sum::<isize>() as usize
- `src/change.rs:100` f(pos_a as usize, pos_b as usize, len as usize);
- `src/change.rs:207` let pos = pos as isize;
- `src/change.rs:214` return Some((pos_b + (pos - pos_a)) as usize);
- `src/change.rs:227` return Some(if pos == pos_a || assoc < 0 { pos_b } else { pos_b + ins } as usize);
- `src/change.rs:234` panic!("{}", Error::PositionOutOfRange { pos: pos as usize, length: pos_a as usize });
- `src/change.rs:236` Some(pos_b as usize)
- `src/change.rs:244` let (from, to) = (from as isize, to as isize);
- `src/change.rs:417` inserted.push(if len != 0 { doc.slice(pos as usize, (pos + len) as usize) } else { Text::empty() });
- `src/change.rs:515` Of { sections: Vec::new(), inserted: Vec::new(), pos: 0, total: None, length: length as isize, line_sep };
- `src/change.rs:529` ChangeSet::create_set(if length != 0 { vec![length as isize, -1] } else { Vec::new() }, Vec::new())
- `src/change.rs:567` sections.extend([len, text.len() as isize]);
- `src/change.rs:614` Some(isize::MAX)
- `src/change.rs:617` ranges.get(i - 1).map(|&n| n as isize)
- `src/change.rs:643` let end = end as isize;
- `src/change.rs:701` if set.length() as isize != self.length {
- `src/change.rs:704` Error::MismatchedChangeSetLength { got: set.length(), expected: self.length as usize }
- `src/change.rs:715` if from > to || to as isize > self.length {
- `src/change.rs:716` panic!("{}", Error::InvalidChangeRange { from, to, length: self.length as usize });
- `src/change.rs:718` let (from, to) = (from as isize, to as isize);
- `src/change.rs:726` let ins_len = ins_text.len() as isize;
- `src/change.rs:779` (f >= 0.0 && f.fract() == 0.0 && f < 9_007_199_254_740_992.0).then_some(f as isize)
- `src/change.rs:811` let index = (sections.len() as isize - 2) >> 1;
- `src/change.rs:812` if index < values.len() as isize {
- `src/change.rs:816` while (values.len() as isize) < index {
- `src/change.rs:853` f(pos_a as usize, end_a as usize, pos_b as usize, end_b as usize, &text);
- `src/change.rs:889` && (a.ins < 0 || inserted == a.i as isize || a.off == 0 && (b.len < a.len || b.len == a.len && !before))
- `src/change.rs:899` if a.ins >= 0 && inserted < a.i as isize && a.len <= piece {
- `src/change.rs:904` inserted = a.i as isize;
- `src/change.rs:925` add_section(&mut sections, len, if inserted < a.i as isize { a.ins } else { 0 }, false);
- `src/change.rs:926` if mk_set && inserted < a.i as isize {
- `src/change.rs:929` inserted = a.i as isize;
- `src/change.rs:1055` (self.i as isize - 2) >> 1
- `src/change.rs:1067` if index >= self.inserted.len() as isize && len == 0 {
- `src/change.rs:1070` self.inserted[index as usize].slice(self.off as usize, (self.off + len) as usize)

### U2 change: `crates/ferrum-state/src/selection.rs` (4)
- `src/selection.rs:174` let anchor = json_length(anchor).ok_or_else(invalid)? as usize;
- `src/selection.rs:175` let head = json_length(head).ok_or_else(invalid)? as usize;
- `src/selection.rs:312` if main >= ranges.len() as f64 {
- `src/selection.rs:318` let main = json_length(&json["main"]).ok_or_else(invalid)? as usize;

### U3 rangeset: `crates/ferrum-state/src/rangeset.rs` (113)
- `src/rangeset.rs:27` pub(crate) const FAR: i64 = 1_000_000_000;
- `src/rangeset.rs:200` self.inner.goto(pos as i64, -FAR)
- `src/rangeset.rs:214` self.inner.from() as usize
- `src/rangeset.rs:221` self.inner.to() as usize
- `src/rangeset.rs:231` if rank < 0 { None } else { Some(rank as usize) }
- `src/rangeset.rs:347` self.to[self.to.len() - 1] as i64
- `src/rangeset.rs:381` let diff = or(arr[mid] as i64 - pos, || {
- `src/rangeset.rs:383` (if end { v.end_side() } else { v.start_side() }) as i64 - side
- `src/rangeset.rs:400` let mut i = self.find_index(from, -FAR, true, 0);
- `src/rangeset.rs:401` let e = self.find_index(to, FAR, false, i);
- `src/rangeset.rs:404` let (a, b) = ((offset as i64 + self.from[i] as i64) as usize, (offset as i64 + self.to[i] as i64) as usize);
- `src/rangeset.rs:431` let cur_from = (offset as i64 + self.from[i] as i64) as usize;
- `src/rangeset.rs:432` let cur_to = (offset as i64 + self.to[i] as i64) as usize;
- `src/rangeset.rs:434` let (start_side, end_side) = (val.start_side() as i64, val.end_side() as i64);
- `src/rangeset.rs:440` new_from = mapped as i64;
- `src/rangeset.rs:443` new_to = changes.map_pos(cur_from, assoc(val.end_side())) as i64;
- `src/rangeset.rs:449` new_from = changes.map_pos(cur_from, assoc(val.start_side())) as i64;
- `src/rangeset.rs:450` new_to = changes.map_pos(cur_to, assoc(val.end_side())) as i64;
- `src/rangeset.rs:476` if or(new_from - (to[j - 1] + new_pos), || start_side - value[j - 1].end_side() as i64) >= 0 {
- `src/rangeset.rs:482` if or(new_from - (from[j - 1] + new_pos), || end_side - value[j - 1].start_side() as i64) > 0 {
- `src/rangeset.rs:489` spill(new_from as usize, new_to as usize, val.clone());
- `src/rangeset.rs:496` from.into_iter().map(|x| x as isize).collect(),
- `src/rangeset.rs:497` to.into_iter().map(|x| x as isize).collect(),
- `src/rangeset.rs:519` self.chunk_pos[index] as i64 + self.chunk[index].length()
- `src/rangeset.rs:610` Some(to) => to as i64,
- `src/rangeset.rs:613` let filter_from = filter_from as i64;
- `src/rangeset.rs:625` cur.goto(0, -FAR);
- `src/rangeset.rs:632` .is_some_and(|r| or(cur.from - r.from as i64, || cur.start_side() - r.value.start_side() as i64) >= 0);
- `src/rangeset.rs:641` && add.peek().is_none_or(|r| this.chunk_end(cur.chunk_index) < r.from as i64)
- `src/rangeset.rs:644` || filter_to < this.chunk_pos[cur.chunk_index] as i64)
- `src/rangeset.rs:650` let (from, to) = (cur.from as usize, cur.to as usize);
- `src/rangeset.rs:666` this.next_layer.update_inner(spill, false, filter, filter_from as usize, Some(filter_to as usize))
- `src/rangeset.rs:687` let touch = changes.touches_range(start, (start as i64 + chunk.length()) as usize);
- `src/rangeset.rs:698` (pos as i64 + last.length(), last.read(n - 1).end_side() as i64)
- `src/rangeset.rs:708` chunk_pos.push(pos as usize);
- `src/rangeset.rs:738` let (from, to) = (from as i64, to as i64);
- `src/rangeset.rs:743` if to >= start as i64
- `src/rangeset.rs:744` && from <= start as i64 + chunk.length()
- `src/rangeset.rs:745` && !chunk.between(start, from - start as i64, to - start as i64, &mut f)
- `src/rangeset.rs:760` inner.goto(from as i64, -FAR);
- `src/rangeset.rs:771` inner.goto(from as i64, -FAR);
- `src/rangeset.rs:787` let min_point_size = min_point_size.map_or(-1, |n| n as i64);
- `src/rangeset.rs:820` side_a.goto(from as i64, -FAR);
- `src/rangeset.rs:822` side_b.goto(from as i64, -FAR);
- `src/rangeset.rs:830` if side_a.to > to as i64 {
- `src/rangeset.rs:849` let (from, to) = (from as i64, to as i64);
- `src/rangeset.rs:850` let mut cursor = SpanCursor::new(sets, None, min_point_size.map_or(-1, |n| n as i64));
- `src/rangeset.rs:851` cursor.goto(from, -FAR);
- `src/rangeset.rs:859` active.len() as i64 + 1
- `src/rangeset.rs:861` active.len() as i64
- `src/rangeset.rs:863` (active.len() as i64).min(open_ranges)
- `src/rangeset.rs:866` pos as usize,
- `src/rangeset.rs:867` cur_to as usize,
- `src/rangeset.rs:870` open_count as usize,
- `src/rangeset.rs:871` cursor.point_rank as usize,
- `src/rangeset.rs:873` open_ranges = cursor.open_end(cur_to).min(active.len() as i64);
- `src/rangeset.rs:875` iterator.span(pos as usize, cur_to as usize, &cursor.active, open_ranges as usize);
- `src/rangeset.rs:879` return (open_ranges + if cursor.point.is_some() && cursor.to > to { 1 } else { 0 }) as usize;
- `src/rangeset.rs:977` last_from: -FAR,
- `src/rangeset.rs:978` last_to: -FAR,
- `src/rangeset.rs:998` self.chunk_pos.push(self.chunk_start as usize);
- `src/rangeset.rs:1036` let (start_side, end_side) = (value.start_side() as i64, value.end_side() as i64);
- `src/rangeset.rs:1038` let diff = or(from as i64 - self.last_to, || start_side - self.last.map_or(0, |l| l.1 as i64));
- `src/rangeset.rs:1041` && or(from as i64 - self.last_from, || start_side - self.last.map_or(0, |l| l.0 as i64)) < 0
- `src/rangeset.rs:1052` self.chunk_start = from as i64;
- `src/rangeset.rs:1054` self.from.push((from as i64 - self.chunk_start) as isize);
- `src/rangeset.rs:1055` self.to.push((to as i64 - self.chunk_start) as isize);
- `src/rangeset.rs:1056` self.last = Some((start_side as i32, end_side as i32));
- `src/rangeset.rs:1057` self.last_from = from as i64;
- `src/rangeset.rs:1058` self.last_to = to as i64;
- `src/rangeset.rs:1060` self.max_point = self.max_point.max(to as i64 - from as i64);
- `src/rangeset.rs:1068` let (from_i, last_end_side) = (from as i64, self.last.map_or(0, |l| l.1 as i64));
- `src/rangeset.rs:1069` if or(from_i - self.last_to, || chunk.read(0).start_side() as i64 - last_end_side) < 0 {
- `src/rangeset.rs:1081` self.last_from = chunk.from[last] as i64 + from_i;
- `src/rangeset.rs:1082` self.last_to = chunk.to[last] as i64 + from_i;
- `src/rangeset.rs:1125` Arc::as_ptr(chunk) as *const () as usize
- `src/rangeset.rs:1150` let end = (known as i64 + l.chunk[i].length()) as usize;
- `src/rangeset.rs:1195` self.value_ref().map_or(0, |v| v.start_side() as i64)
- `src/rangeset.rs:1199` self.value_ref().map_or(0, |v| v.end_side() as i64)
- `src/rangeset.rs:1224` pos - self.layer.chunk_pos[self.chunk_index] as i64,
- `src/rangeset.rs:1245` self.from = FAR;
- `src/rangeset.rs:1246` self.to = FAR;
- `src/rangeset.rs:1251` let (chunk_pos, chunk) = (layer.chunk_pos[self.chunk_index] as i64, &layer.chunk[self.chunk_index]);
- `src/rangeset.rs:1252` self.from = chunk_pos + chunk.from[self.range_index] as i64;
- `src/rangeset.rs:1253` self.to = chunk_pos + chunk.to[self.range_index] as i64;
- `src/rangeset.rs:1287` or(self.rank as i64 - other.rank as i64, || {
- `src/rangeset.rs:1330` let end_side = self.value_ref().map_or(0, |v| v.end_side() as i64);
- `src/rangeset.rs:1338` self.from = FAR;
- `src/rangeset.rs:1339` self.to = FAR;
- `src/rangeset.rs:1347` self.rank = top.rank as i64;
- `src/rangeset.rs:1441` CursorKind::Layer(c) => c.rank as i64,
- `src/rangeset.rs:1447` self.value().map_or(0, |v| v.start_side() as i64)
- `src/rangeset.rs:1480` to: -FAR,
- `src/rangeset.rs:1500` let m = self.min_active as usize;
- `src/rangeset.rs:1501` or(self.active_to[m] - pos, || self.active[m].end_side() as i64 - side) < 0
- `src/rangeset.rs:1503` self.remove_active(self.min_active as usize);
- `src/rangeset.rs:1542` && or(self.active_to[a as usize] - self.cursor.from(), || {
- `src/rangeset.rs:1543` self.active[a as usize].end_side() as i64 - self.cursor.start_side()
- `src/rangeset.rs:1546` let a = a as usize;
- `src/rangeset.rs:1549` self.end_side = self.active[a].end_side() as i64;
- `src/rangeset.rs:1557` self.to = FAR;
- `src/rangeset.rs:1558` self.end_side = FAR;
- `src/rangeset.rs:1574` let end_side = next_val.end_side() as i64;
- `src/rangeset.rs:1640` let (start_a, start_b) = (start_a as i64, start_b as i64);
- `src/rangeset.rs:1641` a.goto(start_a, -FAR);
- `src/rangeset.rs:1642` b.goto(start_b, -FAR);
- `src/rangeset.rs:1643` let end_b = start_b + length as i64;
- `src/rangeset.rs:1660` comparator.compare_point(pos as usize, clip_end as usize, a.point.as_ref(), b.point.as_ref());
- `src/rangeset.rs:1665` comparator.bound_change(pos as usize);
- `src/rangeset.rs:1669` comparator.compare_range(pos as usize, clip_end as usize, &a.active, &b.active);
- `src/rangeset.rs:1705` let mut found_pos = FAR;
- `src/rangeset.rs:1710` if found < 0 { 0 } else { value[i].end_side() as i64 - value[found as usize].end_side() as i64 }
- `src/rangeset.rs:1713` found = i as i64;

### U4 state: `crates/ferrum-state/src/facet.rs` (7)
- `src/facet.rs:813` ExtensionKind::Field(field) => Arc::as_ptr(&field.inner) as *const () as usize,
- `src/facet.rs:814` _ => Arc::as_ptr(&self.inner) as *const () as usize,
- `src/facet.rs:963` Arc::as_ptr(&self.inner) as usize
- `src/facet.rs:1172` Flat::Field(field) => Arc::as_ptr(&field.inner) as *const () as usize,
- `src/facet.rs:1173` Flat::Provider(provider) => Arc::as_ptr(provider) as *const () as usize,
- `src/facet.rs:1194` ExtensionKind::Field(field) => Some(Arc::as_ptr(&field.inner) as *const () as usize),
- `src/facet.rs:1195` ExtensionKind::Provider(provider) => Some(Arc::as_ptr(provider) as *const () as usize),

### U4 state: `crates/ferrum-state/src/state.rs` (2)
- `src/state.rs:614` if n == 0.0 || n > insert.len() as f64 {
- `src/state.rs:617` result.push_str(insert[n as usize - 1]);

### U4 state: `crates/ferrum-state/src/transaction.rs` (2)
- `src/transaction.rs:508` Ok(d) => d.as_millis() as i64,
- `src/transaction.rs:509` Err(e) => -(e.duration().as_millis() as i64),

