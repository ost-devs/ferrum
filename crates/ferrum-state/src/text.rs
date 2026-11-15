//! The document data structure: cm6's `text.ts` (`mirrors/cm6/state/src/text.ts`).
//!
//! A [`Text`] is cm6's tree of lines (D2): a leaf holds at most 32 lines, a node at most 32 children. Positions and
//! lengths are UTF-8 byte offsets in which every line break counts one (D1).

use std::cmp::{max, min};
use std::fmt;
use std::sync::{Arc, LazyLock};

use crate::char::assert_char_boundary;
use crate::error::Error;

/// The branch factor of the tree as an exponent of 2 (cm6's `Tree.BranchShift`, `text.ts:3`).
pub(crate) const BRANCH_SHIFT: usize = 5;
/// The approximate branch factor of the tree, in leaves and nodes (cm6's `Tree.Branch`, `text.ts:6`).
pub(crate) const BRANCH: usize = 1 << BRANCH_SHIFT;

/// The flags of `decompose` (cm6's `Open`, `text.ts:10`): the piece is joined to the one before it (`FROM`), or the
/// next piece is joined to it (`TO`).
const OPEN_FROM: u8 = 1;
const OPEN_TO: u8 = 2;

/// A leaf: at most [`BRANCH`] lines, with line breaks between them (cm6's `TextLeaf`, `text.ts:166`).
pub(crate) struct TextLeaf {
    pub(crate) text: Vec<Arc<str>>,
    pub(crate) length: usize,
}

/// A branch node (cm6's `TextNode`, `text.ts:251`), with a line break between consecutive children.
pub(crate) struct TextNode {
    pub(crate) children: Vec<Text>,
    pub(crate) lines: usize,
    pub(crate) length: usize,
}

/// The two shapes of a document node (cm6's subclasses of `Text`).
pub(crate) enum Tree {
    Leaf(TextLeaf),
    Node(TextNode),
}

/// cm6's `Text.empty` (`text.ts:376`): one node for the process, which `Text::empty()` and `Text::of([""])` return.
static EMPTY: LazyLock<Text> = LazyLock::new(|| Text::leaf(vec![Arc::from("")], 0));

/// cm6's `textLength` (`text.ts:378`): the lines' lengths plus one per break.
fn text_length(text: &[Arc<str>]) -> usize {
    text.iter().map(|l| l.len() + 1).sum::<usize>().saturating_sub(1)
}

/// `s[from..to]` with JavaScript's `slice` clamping of both ends to the string, and the D1 panic for an end inside a
/// character.
fn cut(s: &str, from: usize, to: usize) -> &str {
    let to = min(to, s.len());
    let from = min(from, to);
    assert_char_boundary(s, from);
    assert_char_boundary(s, to);
    &s[from..to]
}

/// The line `last + piece` that cm6's `target[target.length - 1] += line` makes, sharing either part when the other
/// is empty.
fn join(last: &Arc<str>, piece: Arc<str>) -> Arc<str> {
    if last.is_empty() {
        piece
    } else if piece.is_empty() {
        last.clone()
    } else {
        Arc::from(format!("{last}{piece}"))
    }
}

/// cm6's `appendText` (`text.ts:384`): appends the part `from..to` of the lines `text` to `target`, the first piece
/// joined to `target`'s last line. A line taken whole is shared.
fn append_text(text: &[Arc<str>], mut target: Vec<Arc<str>>, from: usize, to: usize) -> Vec<Arc<str>> {
    let (mut pos, mut first) = (0usize, true);
    for line in text {
        if pos > to {
            break;
        }
        let end = pos + line.len();
        if end >= from {
            let piece: Arc<str> = if end > to || pos < from {
                let a = from.saturating_sub(pos);
                let b = if end > to { to - pos } else { line.len() };
                Arc::from(cut(line, a, b))
            } else {
                line.clone()
            };
            if first {
                match target.last_mut() {
                    Some(last) => *last = join(last, piece),
                    None => target.push(piece),
                }
                first = false;
            } else {
                target.push(piece);
            }
        }
        pos = end + 1;
    }
    target
}

/// cm6's `sliceText` (`text.ts:398`).
fn slice_text(text: &[Arc<str>], from: usize, to: usize) -> Vec<Arc<str>> {
    append_text(text, vec![Arc::from("")], from, to)
}

/// cm6's `clip` (`text.ts:580`): `from` into the document, `to` into `from..=length`.
fn clip(text: &Text, from: usize, to: usize) -> (usize, usize) {
    let from = min(text.len(), from);
    (from, max(from, min(text.len(), to)))
}

/// cm6's `TextLeaf.split` (`text.ts:231`): leaves of [`BRANCH`] lines, the last holding the rest.
fn split_leaves(text: Vec<Arc<str>>) -> Vec<Text> {
    let mut target = Vec::with_capacity(text.len() / BRANCH + 1);
    let mut part = Vec::with_capacity(BRANCH);
    for line in text {
        part.push(line);
        if part.len() == BRANCH {
            let len = text_length(&part);
            target.push(Text::leaf(std::mem::replace(&mut part, Vec::with_capacity(BRANCH)), len));
        }
    }
    if !part.is_empty() {
        let len = text_length(&part);
        target.push(Text::leaf(part, len));
    }
    target
}

/// The state of cm6's `TextNode.from` (`text.ts:333`) while it groups children: its closures `add` and `flush` over
/// the locals `chunked`, `currentLines`, `currentLen` and `currentChunk`.
struct Chunker {
    chunk: usize,
    max_chunk: usize,
    min_chunk: usize,
    chunked: Vec<Text>,
    current_lines: usize,
    /// cm6's `currentLen + 1`: cm6 starts it at -1.
    current_len: usize,
    current_chunk: Vec<Text>,
}

impl Chunker {
    fn add(&mut self, child: Text) {
        let child_lines = child.lines();
        if child_lines > self.max_chunk
            && let Tree::Node(node) = &*child.node
        {
            for node in &node.children {
                self.add(node.clone());
            }
        } else if child_lines > self.min_chunk && (self.current_lines > self.min_chunk || self.current_lines == 0) {
            self.flush();
            self.chunked.push(child);
        } else if let (Tree::Leaf(leaf), true) = (&*child.node, self.current_lines > 0)
            && let Some(last) = self.current_chunk.last_mut()
            && let Tree::Leaf(last_leaf) = &*last.node
            && child_lines + last_leaf.text.len() <= BRANCH
        {
            self.current_lines += child_lines;
            self.current_len += leaf.length + 1;
            let mut text = last_leaf.text.clone();
            text.extend(leaf.text.iter().cloned());
            let length = last_leaf.length + 1 + leaf.length;
            *last = Text::leaf(text, length);
        } else {
            if self.current_lines + child_lines > self.chunk {
                self.flush();
            }
            self.current_lines += child_lines;
            self.current_len += child.len() + 1;
            self.current_chunk.push(child);
        }
    }

    fn flush(&mut self) {
        if self.current_lines == 0 {
            return;
        }
        let mut current = std::mem::take(&mut self.current_chunk);
        let piece = if current.len() == 1 {
            current.remove(0)
        } else {
            node_from(current, Some(self.current_len - 1))
        };
        self.chunked.push(piece);
        self.current_len = 0;
        self.current_lines = 0;
    }
}

/// cm6's `TextNode.from` (`text.ts:333`): the document made of `children`, flattened into one leaf below [`BRANCH`]
/// lines, else grouped into nodes of about `max(32, lines >> 5)` lines. `length` defaults to the children's lengths
/// plus one per break.
fn node_from(children: Vec<Text>, length: Option<usize>) -> Text {
    let length = length.unwrap_or_else(|| children.iter().map(|c| c.len() + 1).sum::<usize>().saturating_sub(1));
    let lines: usize = children.iter().map(Text::lines).sum();
    if lines < BRANCH {
        let mut flat = Vec::with_capacity(lines);
        for ch in &children {
            ch.flatten(&mut flat);
        }
        return Text::leaf(flat, length);
    }
    let chunk = max(BRANCH, lines >> BRANCH_SHIFT);
    let mut chunker = Chunker {
        chunk,
        max_chunk: chunk << 1,
        min_chunk: chunk >> 1,
        chunked: Vec::new(),
        current_lines: 0,
        current_len: 0,
        current_chunk: Vec::new(),
    };
    for child in children {
        chunker.add(child);
    }
    chunker.flush();
    let mut chunked = chunker.chunked;
    if chunked.len() == 1 { chunked.remove(0) } else { Text::node(chunked, length) }
}

/// The data structure for documents: an immutable tree of lines, cheap to clone, whose untouched children are shared
/// between a document and the documents edits make from it.
///
/// `==` compares content (N3); `Display` writes the document with its lines joined by `"\n"` (N2); iterating a
/// `&Text` with `for` yields its lines and the breaks between them, as [`Text::iter`] does forward.
///
/// cm6: Text
#[derive(Clone)]
pub struct Text {
    pub(crate) node: Arc<Tree>,
}

impl Text {
    /// The length of the document, in bytes, every line break counting one (D1).
    ///
    /// cm6: Text.length
    /// name: see N1
    pub fn len(&self) -> usize {
        match &*self.node {
            Tree::Leaf(leaf) => leaf.length,
            Tree::Node(node) => node.length,
        }
    }

    /// Whether the document is empty (`len() == 0`).
    ///
    /// ferrum-only: the companion of len, see N1
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    /// The number of lines in the document (always at least 1).
    ///
    /// cm6: Text.lines
    pub fn lines(&self) -> usize {
        match &*self.node {
            Tree::Leaf(leaf) => leaf.text.len(),
            Tree::Node(node) => node.lines,
        }
    }

    /// The line around the given position.
    ///
    /// # Panics
    ///
    /// With `Invalid position <pos> in document of length <len>` ([`Error::InvalidPosition`]) when `pos` is beyond
    /// the end, and when `pos` is not on a `char` boundary (D1).
    ///
    /// [`Error::InvalidPosition`]: crate::error::Error::InvalidPosition
    ///
    /// cm6: Text.lineAt
    pub fn line_at(&self, pos: usize) -> Line {
        if pos > self.len() {
            panic!("{}", Error::InvalidPosition { pos, length: self.len() });
        }
        let line = self.line_inner(pos, false, 1, 0);
        if !line.text.is_char_boundary(pos - line.from) {
            not_a_boundary(pos);
        }
        line
    }

    /// The line with the given 1-based number.
    ///
    /// # Panics
    ///
    /// With `Invalid line number <n> in <lines>-line document` ([`Error::InvalidLineNumber`]) when `n` is 0 or
    /// greater than [`lines`](Text::lines).
    ///
    /// [`Error::InvalidLineNumber`]: crate::error::Error::InvalidLineNumber
    ///
    /// cm6: Text.line
    pub fn line(&self, n: usize) -> Line {
        if n < 1 || n > self.lines() {
            panic!("{}", Error::InvalidLineNumber { n, lines: self.lines() });
        }
        self.line_inner(n, true, 1, 0)
    }

    /// Replaces the range `from..to` with `text`. Both ends are clipped to the document, `to` to at least `from`.
    ///
    /// # Panics
    ///
    /// When `from` or `to`, after clipping, is not on a `char` boundary (D1).
    ///
    /// cm6: Text.replace
    pub fn replace(&self, from: usize, to: usize, text: &Text) -> Text {
        let (from, to) = clip(self, from, to);
        self.assert_boundary(from);
        self.assert_boundary(to);
        self.replace_inner(from, to, text)
    }

    /// Appends another document to this one.
    ///
    /// cm6: Text.append
    pub fn append(&self, other: &Text) -> Text {
        self.replace(self.len(), self.len(), other)
    }

    /// The document between `from` and `to`, clipped as [`replace`](Text::replace) clips. cm6's default for `to`
    /// is [`len`](Text::len), which the caller writes (D14).
    ///
    /// # Panics
    ///
    /// When `from` or `to`, after clipping, is not on a `char` boundary (D1).
    ///
    /// cm6: Text.slice
    pub fn slice(&self, from: usize, to: usize) -> Text {
        let (from, to) = clip(self, from, to);
        self.assert_boundary(from);
        self.assert_boundary(to);
        let mut parts = Vec::new();
        self.decompose(from as isize, to as isize, &mut parts, 0);
        node_from(parts, Some(to - from))
    }

    /// The document between `from` and `to` as a string, its line breaks written as `line_sep`. cm6's defaults,
    /// which the caller writes (D14): `to` is [`len`](Text::len), `line_sep` is `"\n"`.
    ///
    /// # Panics
    ///
    /// When `from` or `to` is not on a `char` boundary (D1).
    ///
    /// cm6: Text.sliceString
    pub fn slice_string(&self, from: usize, to: usize, line_sep: &str) -> String {
        let (from, to) = clip(self, from, to);
        self.assert_boundary(from);
        self.assert_boundary(to);
        let mut result = String::new();
        self.slice_string_into(from, to, line_sep, &mut result);
        result
    }

    /// A cursor over the lines of the document and the breaks between them, as separate strings, walking forward or
    /// backward. cm6's default direction, which the caller writes (D14), is [`IterDirection::Forward`].
    ///
    /// cm6: Text.iter
    pub fn iter(&self, dir: IterDirection) -> TextIterator {
        TextIterator { cursor: Cursor::Raw(RawCursor::new(self.clone(), dir)) }
    }

    /// A cursor over the range `from..to`; when `from > to` it walks backward. cm6's default for `to` is
    /// [`len`](Text::len), which the caller writes (D14).
    ///
    /// # Panics
    ///
    /// When `from` or `to` is not on a `char` boundary (D1).
    ///
    /// cm6: Text.iterRange
    pub fn iter_range(&self, from: usize, to: usize) -> TextIterator {
        for pos in [from, to] {
            if pos <= self.len() {
                self.assert_boundary(pos);
            }
        }
        TextIterator { cursor: Cursor::Partial(PartialCursor::new(self.clone(), from, to)) }
    }

    /// A cursor over lines, without the breaks between them, yielding an empty string for an empty line. `None` is
    /// cm6's call without `from`: the whole document, through [`iter`](Text::iter). `Some((from, to))` covers the
    /// lines numbered `from` to `to` (1-based, `to` excluded); where cm6's caller omits `to`, the caller writes
    /// [`lines`](Text::lines)` + 1` (D14).
    ///
    /// # Panics
    ///
    /// With `Invalid line number <n> in <lines>-line document` when `from`, or `to - 1` when `to` is neither 0, 1
    /// nor `lines() + 1`, is not a line of the document.
    ///
    /// cm6: Text.iterLines
    pub fn iter_lines(&self, range: Option<(usize, usize)>) -> TextIterator {
        let inner = match range {
            None => self.iter(IterDirection::Forward),
            Some((from, to)) => {
                let start = self.line(from).from;
                let end = if to == self.lines() + 1 {
                    self.len()
                } else if to <= 1 {
                    0
                } else {
                    self.line(to - 1).to
                };
                self.iter_range(start, max(start, end))
            }
        };
        TextIterator {
            cursor: Cursor::Lines(Box::new(LineCursor {
                inner,
                after_break: true,
                value: Value::Empty,
                done: false,
            })),
        }
    }

    /// The lines of the document, without their breaks (the input [`Text::of`] takes).
    ///
    /// cm6: Text.toJSON
    pub fn to_json(&self) -> Vec<String> {
        let mut lines = Vec::with_capacity(self.lines());
        self.flatten(&mut lines);
        lines.iter().map(|l| l.to_string()).collect()
    }

    /// The children of a branch node; `None` for a leaf (a document of at most 32 lines).
    ///
    /// cm6: Text.children
    pub fn children(&self) -> Option<&[Text]> {
        match &*self.node {
            Tree::Leaf(_) => None,
            Tree::Node(node) => Some(&node.children),
        }
    }

    /// A document holding the given lines, copied. A single empty line gives [`Text::empty`].
    ///
    /// # Panics
    ///
    /// With `A document must have at least one line` ([`Error::EmptyDocument`]) when `text` is empty.
    ///
    /// [`Error::EmptyDocument`]: crate::error::Error::EmptyDocument
    ///
    /// cm6: Text.of
    pub fn of<S: AsRef<str>>(text: &[S]) -> Text {
        if text.is_empty() {
            panic!("{}", Error::EmptyDocument);
        }
        if text.len() == 1 && text[0].as_ref().is_empty() {
            return Text::empty();
        }
        // cm6 keeps the caller's array as the leaf's storage (`text.ts:156`); Ferrum copies it (`state.cm6.229.d1`)
        let lines: Vec<Arc<str>> = text.iter().map(|l| Arc::from(l.as_ref())).collect();
        if lines.len() <= BRANCH {
            let length = text_length(&lines);
            Text::leaf(lines, length)
        } else {
            node_from(split_leaves(lines), None)
        }
    }

    /// The empty document: one node, which every call returns.
    ///
    /// cm6: Text.empty
    pub fn empty() -> Text {
        EMPTY.clone()
    }

    /// Whether `pos` lies on a `char` boundary of the document, where every function that takes a position accepts
    /// it (D1). A position beyond the end is not a boundary.
    ///
    /// ferrum-only: the test of the precondition of every position, see D1
    pub fn is_char_boundary(&self, pos: usize) -> bool {
        if pos > self.len() {
            return false;
        }
        let line = self.line_inner(pos, false, 1, 0);
        line.text.is_char_boundary(pos - line.from)
    }
}

/// The D1 panic of a document position inside a character.
fn not_a_boundary(pos: usize) -> ! {
    panic!("Position {pos} is not on a character boundary of the document")
}

/// What cm6's subclasses of `Text` implement (`text.ts:166-374`), dispatched on the node's shape.
impl Text {
    fn leaf(text: Vec<Arc<str>>, length: usize) -> Text {
        Text { node: Arc::new(Tree::Leaf(TextLeaf { text, length })) }
    }

    /// cm6's `new TextNode(children, length)` (`text.ts:254`): the lines are the children's.
    fn node(children: Vec<Text>, length: usize) -> Text {
        let lines = children.iter().map(Text::lines).sum();
        Text { node: Arc::new(Tree::Node(TextNode { children, lines, length })) }
    }

    /// The number of lines of a leaf or children of a node: what a cursor steps through at this level.
    fn size(&self) -> usize {
        match &*self.node {
            Tree::Leaf(leaf) => leaf.text.len(),
            Tree::Node(node) => node.children.len(),
        }
    }

    /// The D1 precondition of a position of the document, `pos` being at most its length.
    fn assert_boundary(&self, pos: usize) {
        if !self.is_char_boundary(pos) {
            not_a_boundary(pos);
        }
    }

    /// cm6's `lineInner` (`text.ts:175`, `:259`): the line whose number (`is_line`) or whose end reaches `target`.
    fn line_inner(&self, target: usize, is_line: bool, mut line: usize, mut offset: usize) -> Line {
        match &*self.node {
            Tree::Leaf(leaf) => {
                for string in &leaf.text {
                    let end = offset + string.len();
                    if (if is_line { line } else { end }) >= target {
                        return Line { from: offset, to: end, number: line, text: string.clone() };
                    }
                    offset = end + 1;
                    line += 1;
                }
            }
            Tree::Node(node) => {
                for child in &node.children {
                    let end = offset + child.len();
                    let end_line = line + child.lines() - 1;
                    if (if is_line { end_line } else { end }) >= target {
                        return child.line_inner(target, is_line, line, offset);
                    }
                    offset = end + 1;
                    line = end_line + 1;
                }
            }
        }
        // cm6 reads past the array here, which only a NaN target reaches (`text.ts:177`, `:261`; D12)
        unreachable!("line_inner is called with a position or line number inside the document")
    }

    /// cm6's `decompose` (`text.ts:185`, `:269`): pushes the pieces of `from..to` onto `target`, whole children
    /// shared. `from` is signed: a node passes `from - pos`, negative for the children after `from`, and the sign
    /// decides whether a child is open at its start.
    fn decompose(&self, from: isize, to: isize, target: &mut Vec<Text>, open: u8) {
        match &*self.node {
            Tree::Leaf(leaf) => {
                let length = leaf.length as isize;
                let text = if from <= 0 && to >= length {
                    self.clone()
                } else {
                    let (a, b) = (max(0, from) as usize, to as usize);
                    Text::leaf(slice_text(&leaf.text, a, b), (min(to, length) - max(0, from)) as usize)
                };
                if open & OPEN_FROM != 0 {
                    let Some(prev) = target.pop() else {
                        unreachable!("an open piece follows another piece")
                    };
                    let (Tree::Leaf(prev), Tree::Leaf(piece)) = (&*prev.node, &*text.node) else {
                        unreachable!("the pieces at an open seam are leaves")
                    };
                    let joined = append_text(&piece.text, prev.text.clone(), 0, piece.length);
                    if joined.len() <= BRANCH {
                        target.push(Text::leaf(joined, prev.length + piece.length));
                    } else {
                        let mid = joined.len() >> 1;
                        let (a, b) = (joined[..mid].to_vec(), joined[mid..].to_vec());
                        let (la, lb) = (text_length(&a), text_length(&b));
                        target.push(Text::leaf(a, la));
                        target.push(Text::leaf(b, lb));
                    }
                } else {
                    target.push(text);
                }
            }
            Tree::Node(node) => {
                let mut pos: isize = 0;
                for child in &node.children {
                    if pos > to {
                        break;
                    }
                    let end = pos + child.len() as isize;
                    if from <= end && to >= pos {
                        let child_open =
                            open & ((if pos <= from { OPEN_FROM } else { 0 }) | (if end >= to { OPEN_TO } else { 0 }));
                        if pos >= from && end <= to && child_open == 0 {
                            target.push(child.clone());
                        } else {
                            child.decompose(from - pos, to - pos, target, child_open);
                        }
                    }
                    pos = end + 1;
                }
            }
        }
    }

    /// cm6's `replace` of each class, after the public checks: `TextLeaf.replace` (`text.ts:202`), `TextNode.replace`
    /// (`text.ts:281`), and `Text.replace` (`text.ts:54`) where they fall back to it.
    fn replace_inner(&self, from: usize, to: usize, text: &Text) -> Text {
        match (&*self.node, &*text.node) {
            (Tree::Leaf(leaf), Tree::Leaf(insert)) => {
                let (from, to) = clip(self, from, to);
                let lines = append_text(
                    &leaf.text,
                    append_text(&insert.text, slice_text(&leaf.text, 0, from), 0, usize::MAX),
                    to,
                    usize::MAX,
                );
                let new_len = leaf.length + insert.length - (to - from);
                if lines.len() <= BRANCH {
                    Text::leaf(lines, new_len)
                } else {
                    node_from(split_leaves(lines), Some(new_len))
                }
            }
            (Tree::Leaf(_), Tree::Node(_)) => self.replace_general(from, to, text),
            (Tree::Node(node), _) => {
                let (from, to) = clip(self, from, to);
                if text.lines() < node.lines {
                    let mut pos = 0;
                    for (i, child) in node.children.iter().enumerate() {
                        let end = pos + child.len();
                        // cm6's fast path: a change inside one child that keeps its size in range updates only
                        // that child (`text.ts:285-296`)
                        if from >= pos && to <= end {
                            let updated = child.replace_inner(from - pos, to - pos, text);
                            let total_lines = node.lines - child.lines() + updated.lines();
                            if updated.lines() < (total_lines >> (BRANCH_SHIFT - 1))
                                && updated.lines() > (total_lines >> (BRANCH_SHIFT + 1))
                            {
                                let mut copy = node.children.clone();
                                copy[i] = updated;
                                return Text::node(copy, node.length - (to - from) + text.len());
                            }
                            return self.replace_general(pos, end, &updated);
                        }
                        pos = end + 1;
                    }
                }
                self.replace_general(from, to, text)
            }
        }
    }

    /// cm6's `Text.replace` (`text.ts:54`): the parts before and after the range and the inserted text, decomposed
    /// and rebuilt by `TextNode.from`.
    fn replace_general(&self, from: usize, to: usize, text: &Text) -> Text {
        let (from, to) = clip(self, from, to);
        let mut parts = Vec::new();
        self.decompose(0, from as isize, &mut parts, OPEN_TO);
        if !text.is_empty() {
            text.decompose(0, text.len() as isize, &mut parts, OPEN_FROM | OPEN_TO);
        }
        self.decompose(to as isize, self.len() as isize, &mut parts, OPEN_FROM);
        node_from(parts, Some(self.len() - (to - from) + text.len()))
    }

    /// cm6's `sliceString` (`text.ts:211`, `:304`), writing into `result`. A node gives its children `from - pos`,
    /// which their `clip` raises to 0, so the saturated difference is the same.
    fn slice_string_into(&self, from: usize, to: usize, line_sep: &str, result: &mut String) {
        let (from, to) = clip(self, from, to);
        match &*self.node {
            Tree::Leaf(leaf) => {
                let mut pos = 0;
                for (i, line) in leaf.text.iter().enumerate() {
                    if pos > to {
                        break;
                    }
                    let end = pos + line.len();
                    if pos > from && i > 0 {
                        result.push_str(line_sep);
                    }
                    if from < end && to > pos {
                        result.push_str(cut(line, from.saturating_sub(pos), to - pos));
                    }
                    pos = end + 1;
                }
            }
            Tree::Node(node) => {
                let mut pos = 0;
                for (i, child) in node.children.iter().enumerate() {
                    if pos > to {
                        break;
                    }
                    let end = pos + child.len();
                    if pos > from && i > 0 {
                        result.push_str(line_sep);
                    }
                    if from < end && to > pos {
                        child.slice_string_into(from.saturating_sub(pos), to - pos, line_sep, result);
                    }
                    pos = end + 1;
                }
            }
        }
    }

    /// cm6's `flatten` (`text.ts:225`, `:316`): the lines, shared.
    fn flatten(&self, target: &mut Vec<Arc<str>>) {
        match &*self.node {
            Tree::Leaf(leaf) => target.extend(leaf.text.iter().cloned()),
            Tree::Node(node) => {
                for child in &node.children {
                    child.flatten(target);
                }
            }
        }
    }

    /// cm6's `scanIdentical` (`text.ts:229`, `:320`): the length of the children the two nodes share, from the start
    /// (`forward`) or the end, plus one per break after each, recursing into the first pair that differs.
    fn scan_identical(&self, other: &Text, forward: bool) -> usize {
        let (Tree::Node(a), Tree::Node(b)) = (&*self.node, &*other.node) else { return 0 };
        let mut length = 0;
        for k in 0..min(a.children.len(), b.children.len()) {
            let (ch_a, ch_b) = if forward {
                (&a.children[k], &b.children[k])
            } else {
                (&a.children[a.children.len() - 1 - k], &b.children[b.children.len() - 1 - k])
            };
            if !Arc::ptr_eq(&ch_a.node, &ch_b.node) {
                return length + ch_a.scan_identical(ch_b, forward);
            }
            length += ch_a.len() + 1;
        }
        length
    }
}

/// cm6 impl: Text.eq, see N3
impl PartialEq for Text {
    fn eq(&self, other: &Text) -> bool {
        if Arc::ptr_eq(&self.node, &other.node) {
            return true;
        }
        if other.len() != self.len() || other.lines() != self.lines() {
            return false;
        }
        let start = self.scan_identical(other, true);
        // cm6's `end` can be negative when the two share every child (`text.ts:89`)
        let end = self.len() as isize - self.scan_identical(other, false) as isize;
        let mut a = RawCursor::new(self.clone(), IterDirection::Forward);
        let mut b = RawCursor::new(other.clone(), IterDirection::Forward);
        let (mut skip, mut pos) = (start as isize, start as isize);
        loop {
            a.next(skip);
            b.next(skip);
            skip = 0;
            if a.line_break != b.line_break || a.done != b.done || a.value.as_str() != b.value.as_str() {
                return false;
            }
            pos += a.value.as_str().len() as isize;
            if a.done || pos >= end {
                return true;
            }
        }
    }
}

impl Eq for Text {}

/// cm6 impl: Text.toString, see N2
impl fmt::Display for Text {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        // cm6's `sliceString(0)` (`text.ts:132`), written line by line into the formatter
        fn write(text: &Text, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            match &*text.node {
                Tree::Leaf(leaf) => {
                    for (i, line) in leaf.text.iter().enumerate() {
                        if i > 0 {
                            f.write_str("\n")?;
                        }
                        f.write_str(line)?;
                    }
                }
                Tree::Node(node) => {
                    for (i, child) in node.children.iter().enumerate() {
                        if i > 0 {
                            f.write_str("\n")?;
                        }
                        write(child, f)?;
                    }
                }
            }
            Ok(())
        }
        write(self, f)
    }
}

impl fmt::Debug for Text {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let mut lines = Vec::with_capacity(self.lines());
        self.flatten(&mut lines);
        f.debug_tuple("Text").field(&lines).finish()
    }
}

/// cm6 impl: Text.[Symbol.iterator], see N8
impl IntoIterator for &Text {
    type Item = String;
    type IntoIter = TextIntoIter;

    fn into_iter(self) -> TextIntoIter {
        TextIntoIter { cursor: self.iter(IterDirection::Forward) }
    }
}

/// A line of a document, created when it is asked for ([`Text::line_at`], [`Text::line`]).
///
/// cm6: Line
#[derive(Clone, Debug)]
pub struct Line {
    pub(crate) from: usize,
    pub(crate) to: usize,
    pub(crate) number: usize,
    pub(crate) text: Arc<str>,
}

impl Line {
    /// The position of the start of the line.
    ///
    /// cm6: Line.from
    pub fn from(&self) -> usize {
        self.from
    }

    /// The position of the end of the line, before its break (or the end of the document for the last line).
    ///
    /// cm6: Line.to
    pub fn to(&self) -> usize {
        self.to
    }

    /// The line's number, 1-based.
    ///
    /// cm6: Line.number
    pub fn number(&self) -> usize {
        self.number
    }

    /// The line's content, without its break.
    ///
    /// cm6: Line.text
    pub fn text(&self) -> &str {
        &self.text
    }

    /// The length of the line, without its break: `to() - from()`.
    ///
    /// cm6: Line.length
    /// name: see N1
    pub fn len(&self) -> usize {
        self.to - self.from
    }

    /// Whether the line is empty (`len() == 0`).
    ///
    /// ferrum-only: the companion of len, see N1
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

/// The direction of a [`Text::iter`] cursor: cm6's `1` and `-1`.
///
/// ferrum-only: the type of cm6's dir parameter 1 | -1, see N11
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum IterDirection {
    /// From the start to the end (cm6's `1`).
    ///
    /// ferrum-only: cm6's dir 1, see N11
    Forward,
    /// From the end to the start (cm6's `-1`).
    ///
    /// ferrum-only: cm6's dir -1, see N11
    Backward,
}

/// The current string of a cursor, sharing the line it is part of.
#[derive(Clone)]
pub(crate) enum Value {
    /// `""`.
    Empty,
    /// `"\n"`, a line break.
    Break,
    /// `line[start..end]`.
    Part(Arc<str>, usize, usize),
}

impl Value {
    fn as_str(&self) -> &str {
        match self {
            Value::Empty => "",
            Value::Break => "\n",
            Value::Part(line, start, end) => &line[*start..*end],
        }
    }

    /// cm6's `value.slice(from, to)` on a value, `from <= to <= len`, with the D1 panic for an end inside a
    /// character.
    fn slice(&self, from: usize, to: usize) -> Value {
        match self {
            Value::Empty => Value::Empty,
            Value::Break => {
                if from == 0 && to >= 1 {
                    Value::Break
                } else {
                    Value::Empty
                }
            }
            Value::Part(line, start, end) => {
                let s = &line[*start..*end];
                let to = min(to, s.len());
                let from = min(from, to);
                cut(s, from, to);
                if from == to { Value::Empty } else { Value::Part(line.clone(), start + from, start + to) }
            }
        }
    }
}

/// cm6's `RawTextCursor` (`text.ts:402`): a stack of the nodes from the root to the current leaf, and for each its
/// offset shifted one to the left, the low bit telling whether the position is after the line break that follows
/// the entry at that offset.
pub(crate) struct RawCursor {
    pub(crate) done: bool,
    pub(crate) line_break: bool,
    pub(crate) value: Value,
    nodes: Vec<Text>,
    offsets: Vec<usize>,
    dir: IterDirection,
}

impl RawCursor {
    fn new(text: Text, dir: IterDirection) -> RawCursor {
        let offset = if dir == IterDirection::Forward { 1 } else { text.size() << 1 };
        RawCursor { done: false, line_break: false, value: Value::Empty, nodes: vec![text], offsets: vec![offset], dir }
    }

    /// cm6's `nextInner` (`text.ts:417`). `skip` is never negative there.
    fn next_inner(&mut self, mut skip: usize, dir: IterDirection) {
        let forward = dir == IterDirection::Forward;
        self.done = false;
        self.line_break = false;
        loop {
            let last = self.nodes.len() - 1;
            let offset_value = self.offsets[last];
            let offset = offset_value >> 1;
            let top = &self.nodes[last];
            let size = top.size();
            if offset == (if forward { size } else { 0 }) {
                if last == 0 {
                    self.done = true;
                    self.value = Value::Empty;
                    return;
                }
                if forward {
                    self.offsets[last - 1] += 1;
                }
                self.nodes.pop();
                self.offsets.pop();
            } else if (offset_value & 1) == (if forward { 0 } else { 1 }) {
                step(&mut self.offsets[last], forward);
                if skip == 0 {
                    self.line_break = true;
                    self.value = Value::Break;
                    return;
                }
                skip -= 1;
            } else {
                match &*top.node {
                    Tree::Leaf(leaf) => {
                        // Move to the next string
                        let next = &leaf.text[if forward { offset } else { offset - 1 }];
                        step(&mut self.offsets[last], forward);
                        if next.len() > skip {
                            let whole = Value::Part(next.clone(), 0, next.len());
                            self.value = if skip == 0 {
                                whole
                            } else if forward {
                                whole.slice(skip, next.len())
                            } else {
                                whole.slice(0, next.len() - skip)
                            };
                            return;
                        }
                        skip -= next.len();
                    }
                    Tree::Node(node) => {
                        let next = node.children[if forward { offset } else { offset - 1 }].clone();
                        if skip > next.len() {
                            skip -= next.len();
                            step(&mut self.offsets[last], forward);
                        } else {
                            if !forward {
                                self.offsets[last] -= 1;
                            }
                            self.offsets.push(if forward { 1 } else { next.size() << 1 });
                            self.nodes.push(next);
                        }
                    }
                }
            }
        }
    }

    /// cm6's `next` (`text.ts:463`): a negative skip is a step of `-skip` against the direction, then a step over
    /// the value it gave (`state.cm6.225.d1`).
    fn next(&mut self, skip: isize) {
        let mut skip = skip;
        if skip < 0 {
            self.next_inner(skip.unsigned_abs(), reverse(self.dir));
            skip = self.value.as_str().len() as isize;
        }
        self.next_inner(skip as usize, self.dir);
    }
}

fn reverse(dir: IterDirection) -> IterDirection {
    match dir {
        IterDirection::Forward => IterDirection::Backward,
        IterDirection::Backward => IterDirection::Forward,
    }
}

/// cm6's `this.offsets[last] += dir`.
fn step(offset: &mut usize, forward: bool) {
    if forward {
        *offset += 1;
    } else {
        *offset -= 1;
    }
}

/// cm6's `PartialTextCursor` (`text.ts:475`). Its positions are signed, as cm6's: before the first step of a reverse
/// cursor a positive skip is clipped to a negative one (`text.ts:507-509`, `state.cm6.225.d1`).
pub(crate) struct PartialCursor {
    cursor: RawCursor,
    value: Value,
    pos: isize,
    from: isize,
    to: isize,
    done: bool,
}

impl PartialCursor {
    fn new(text: Text, start: usize, end: usize) -> PartialCursor {
        let backward = start > end;
        let pos = if backward { text.len() as isize } else { 0 };
        let dir = if backward { IterDirection::Backward } else { IterDirection::Forward };
        PartialCursor {
            cursor: RawCursor::new(text, dir),
            value: Value::Empty,
            pos,
            from: min(start, end) as isize,
            to: max(start, end) as isize,
            done: false,
        }
    }

    /// cm6's `nextInner` (`text.ts:490`).
    fn next_inner(&mut self, mut skip: isize, dir: IterDirection) {
        let backward = dir == IterDirection::Backward;
        if if backward { self.pos <= self.from } else { self.pos >= self.to } {
            self.value = Value::Empty;
            self.done = true;
            return;
        }
        skip += max(0, if backward { self.pos - self.to } else { self.from - self.pos });
        let mut limit = if backward { self.pos - self.from } else { self.to - self.pos };
        if skip > limit {
            skip = limit;
        }
        limit -= skip;
        self.cursor.next(skip);
        let value = self.cursor.value.clone();
        let len = value.as_str().len() as isize;
        self.pos += (len + skip) * if backward { -1 } else { 1 };
        self.value = if len <= limit {
            value
        } else if backward {
            value.slice((len - limit) as usize, len as usize)
        } else {
            value.slice(0, limit as usize)
        };
        self.done = self.value.as_str().is_empty();
    }

    /// cm6's `next` (`text.ts:507`): the skip is clipped by the forward bounds whatever the direction
    /// (`state.cm6.225.d1`).
    fn next(&mut self, skip: isize) {
        let mut skip = skip;
        if skip < 0 {
            skip = max(skip, self.from - self.pos);
        } else if skip > 0 {
            skip = min(skip, self.to - self.pos);
        }
        self.next_inner(skip, self.cursor.dir);
    }
}

/// cm6's `LineCursor` (`text.ts:519`), over a raw or a partial cursor.
pub(crate) struct LineCursor {
    inner: TextIterator,
    after_break: bool,
    value: Value,
    done: bool,
}

impl LineCursor {
    /// cm6's `next` (`text.ts:526`). `done` is set and never cleared, as in cm6 (`state.cm6.225.d1`).
    fn next(&mut self, skip: isize) {
        self.inner.next(skip);
        let (done, line_break) = (self.inner.done(), self.inner.line_break());
        if done && self.after_break {
            self.value = Value::Empty;
            self.after_break = false;
        } else if done {
            self.done = true;
            self.value = Value::Empty;
        } else if line_break {
            if self.after_break {
                self.value = Value::Empty;
            } else {
                self.after_break = true;
                self.next(0);
            }
        } else {
            self.value = self.inner.current();
            self.after_break = false;
        }
    }
}

/// The three cursors cm6 implements `TextIterator` with (`text.ts:402`, `:475`, `:519`).
pub(crate) enum Cursor {
    Raw(RawCursor),
    Partial(PartialCursor),
    Lines(Box<LineCursor>),
}

/// A cursor over the strings of a document: lines, parts of lines, and line breaks. It starts before its first
/// string; [`next`](TextIterator::next) moves it, and its getters read where it stands. A `for` loop over it yields
/// the strings it moves through.
///
/// cm6: TextIterator
pub struct TextIterator {
    pub(crate) cursor: Cursor,
}

impl TextIterator {
    /// Moves to the next string, first skipping `skip` positions in the cursor's direction (a negative `skip` moves
    /// against it, as cm6's cursors do, `state.cm6.225.d1`). cm6's default `skip` is 0, which the caller writes
    /// (D14). Returns the cursor itself.
    ///
    /// # Panics
    ///
    /// When the skip ends inside a character (D1).
    ///
    /// cm6: TextIterator.next
    pub fn next(&mut self, skip: isize) -> &mut TextIterator {
        match &mut self.cursor {
            Cursor::Raw(c) => c.next(skip),
            Cursor::Partial(c) => c.next(skip),
            Cursor::Lines(c) => c.next(skip),
        }
        self
    }

    /// The current string: empty at the end and before the first [`next`](TextIterator::next).
    ///
    /// cm6: TextIterator.value
    pub fn value(&self) -> &str {
        match &self.cursor {
            Cursor::Raw(c) => c.value.as_str(),
            Cursor::Partial(c) => c.value.as_str(),
            Cursor::Lines(c) => c.value.as_str(),
        }
    }

    /// Whether the end has been reached.
    ///
    /// cm6: TextIterator.done
    pub fn done(&self) -> bool {
        match &self.cursor {
            Cursor::Raw(c) => c.done,
            Cursor::Partial(c) => c.done,
            Cursor::Lines(c) => c.done,
        }
    }

    /// Whether the current string is a line break.
    ///
    /// cm6: TextIterator.lineBreak
    pub fn line_break(&self) -> bool {
        match &self.cursor {
            Cursor::Raw(c) => c.line_break,
            // cm6's getter (`text.ts:513`)
            Cursor::Partial(c) => c.cursor.line_break && !c.value.as_str().is_empty(),
            // cm6's getter (`text.ts:548`)
            Cursor::Lines(_) => false,
        }
    }
}

impl TextIterator {
    /// The current value, shared.
    fn current(&self) -> Value {
        match &self.cursor {
            Cursor::Raw(c) => c.value.clone(),
            Cursor::Partial(c) => c.value.clone(),
            Cursor::Lines(c) => c.value.clone(),
        }
    }
}

impl IntoIterator for TextIterator {
    type Item = String;
    type IntoIter = TextIntoIter;

    fn into_iter(self) -> TextIntoIter {
        TextIntoIter { cursor: self }
    }
}

/// The iterator a `for` loop over a `&Text` or a [`TextIterator`] runs: each call moves the cursor with `next(0)`
/// and yields its value, until the cursor is done.
///
/// ferrum-only: the iterator of the IntoIterator implementations of Text and TextIterator, see N8
pub struct TextIntoIter {
    pub(crate) cursor: TextIterator,
}

impl Iterator for TextIntoIter {
    type Item = String;

    fn next(&mut self) -> Option<String> {
        let cursor = self.cursor.next(0);
        if cursor.done() { None } else { Some(cursor.value().to_string()) }
    }
}

/// Which input a document or an insertion is given as: cm6's `string | Text` (`EditorStateConfig.doc`,
/// the `insert` of a change, `EditorState.replaceSelection`). A string is split into lines where it is used, on
/// `\r\n?|\n` or on the state's line separator (D2).
///
/// ferrum-only: cm6's union string | Text, see N17
#[derive(Clone, Debug)]
pub enum TextSpec {
    /// A string, split into lines where it is used.
    ///
    /// ferrum-only: the string member of cm6's union, see N17
    String(String),
    /// A document, used as it is.
    ///
    /// ferrum-only: the Text member of cm6's union, see N17
    Text(Text),
}

impl From<&str> for TextSpec {
    fn from(s: &str) -> TextSpec {
        TextSpec::String(s.to_string())
    }
}

impl From<String> for TextSpec {
    fn from(s: String) -> TextSpec {
        TextSpec::String(s)
    }
}

impl From<Text> for TextSpec {
    fn from(t: Text) -> TextSpec {
        TextSpec::Text(t)
    }
}
