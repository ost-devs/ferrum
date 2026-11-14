//! The document data structure: cm6's `text.ts` (`mirrors/cm6/state/src/text.ts`).
//!
//! A [`Text`] is cm6's tree of lines (D2): a leaf holds at most 32 lines, a node at most 32 children. Positions and
//! lengths are UTF-8 byte offsets in which every line break counts one (D1).

use std::fmt;
use std::sync::Arc;

/// The branch factor of the tree as an exponent of 2 (cm6's `Tree.BranchShift`, `text.ts:3`).
pub(crate) const BRANCH_SHIFT: usize = 5;
/// The approximate branch factor of the tree, in leaves and nodes (cm6's `Tree.Branch`, `text.ts:6`).
pub(crate) const BRANCH: usize = 1 << BRANCH_SHIFT;

/// A leaf: at most [`BRANCH`] lines, with line breaks between them (cm6's `TextLeaf`, `text.ts:166`).
pub(crate) struct TextLeaf {
    pub(crate) text: Vec<Arc<str>>,
    pub(crate) length: usize,
}

/// A branch node (cm6's `TextNode`, `text.ts:243`).
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
        todo!()
    }

    /// Whether the document is empty (`len() == 0`).
    ///
    /// ferrum-only: the companion of len, see N1
    pub fn is_empty(&self) -> bool {
        todo!()
    }

    /// The number of lines in the document (always at least 1).
    ///
    /// cm6: Text.lines
    pub fn lines(&self) -> usize {
        todo!()
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
        todo!()
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
        todo!()
    }

    /// Replaces the range `from..to` with `text`. Both ends are clipped to the document, `to` to at least `from`.
    ///
    /// # Panics
    ///
    /// When `from` or `to`, after clipping, is not on a `char` boundary (D1).
    ///
    /// cm6: Text.replace
    pub fn replace(&self, from: usize, to: usize, text: &Text) -> Text {
        todo!()
    }

    /// Appends another document to this one.
    ///
    /// cm6: Text.append
    pub fn append(&self, other: &Text) -> Text {
        todo!()
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
        todo!()
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
        todo!()
    }

    /// A cursor over the lines of the document and the breaks between them, as separate strings, walking forward or
    /// backward. cm6's default direction, which the caller writes (D14), is [`IterDirection::Forward`].
    ///
    /// cm6: Text.iter
    pub fn iter(&self, dir: IterDirection) -> TextIterator {
        todo!()
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
        todo!()
    }

    /// A cursor over the lines numbered `from` to `to` (1-based, `to` excluded), without the breaks between them,
    /// yielding an empty string for an empty line. With `from` `None` it covers the whole document through
    /// [`iter`](Text::iter) and `to` is not read; cm6's default for `to` is [`lines`](Text::lines)` + 1`, which the
    /// caller writes (D14).
    ///
    /// # Panics
    ///
    /// With `Invalid line number <n> in <lines>-line document` when `from`, or `to - 1` when `to` is neither 0, 1
    /// nor `lines() + 1`, is not a line of the document.
    ///
    /// cm6: Text.iterLines
    pub fn iter_lines(&self, from: Option<usize>, to: usize) -> TextIterator {
        todo!()
    }

    /// The lines of the document, without their breaks (the input [`Text::of`] takes).
    ///
    /// cm6: Text.toJSON
    pub fn to_json(&self) -> Vec<String> {
        todo!()
    }

    /// The children of a branch node; `None` for a leaf (a document of at most 32 lines).
    ///
    /// cm6: Text.children
    pub fn children(&self) -> Option<&[Text]> {
        todo!()
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
        todo!()
    }

    /// The empty document: one node, which every call returns.
    ///
    /// cm6: Text.empty
    pub fn empty() -> Text {
        todo!()
    }

    /// Whether `pos` lies on a `char` boundary of the document, where every function that takes a position accepts
    /// it (D1). A position beyond the end is not a boundary.
    ///
    /// ferrum-only: the test of the precondition of every position, see D1
    pub fn is_char_boundary(&self, pos: usize) -> bool {
        todo!()
    }
}

impl PartialEq for Text {
    fn eq(&self, other: &Text) -> bool {
        todo!()
    }
}

impl Eq for Text {}

impl fmt::Display for Text {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        todo!()
    }
}

impl fmt::Debug for Text {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        todo!()
    }
}

impl IntoIterator for &Text {
    type Item = String;
    type IntoIter = TextIntoIter;

    fn into_iter(self) -> TextIntoIter {
        todo!()
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
        todo!()
    }

    /// The position of the end of the line, before its break (or the end of the document for the last line).
    ///
    /// cm6: Line.to
    pub fn to(&self) -> usize {
        todo!()
    }

    /// The line's number, 1-based.
    ///
    /// cm6: Line.number
    pub fn number(&self) -> usize {
        todo!()
    }

    /// The line's content, without its break.
    ///
    /// cm6: Line.text
    pub fn text(&self) -> &str {
        todo!()
    }

    /// The length of the line, without its break: `to() - from()`.
    ///
    /// cm6: Line.length
    /// name: see N1
    pub fn len(&self) -> usize {
        todo!()
    }

    /// Whether the line is empty (`len() == 0`).
    ///
    /// ferrum-only: the companion of len, see N1
    pub fn is_empty(&self) -> bool {
        todo!()
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

/// The three cursors cm6 implements `TextIterator` with (`text.ts:381`, `:476`, `:518`).
pub(crate) enum Cursor {
    Raw,
    Partial,
    Lines,
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
        todo!()
    }

    /// The current string: empty at the end and before the first [`next`](TextIterator::next).
    ///
    /// cm6: TextIterator.value
    pub fn value(&self) -> &str {
        todo!()
    }

    /// Whether the end has been reached.
    ///
    /// cm6: TextIterator.done
    pub fn done(&self) -> bool {
        todo!()
    }

    /// Whether the current string is a line break.
    ///
    /// cm6: TextIterator.lineBreak
    pub fn line_break(&self) -> bool {
        todo!()
    }
}

impl IntoIterator for TextIterator {
    type Item = String;
    type IntoIter = TextIntoIter;

    fn into_iter(self) -> TextIntoIter {
        todo!()
    }
}

/// The iterator a `for` loop over a `&Text` or a [`TextIterator`] runs: each call moves the cursor with `next(0)`
/// and yields its value, until the cursor is done.
///
/// cm6: Text.[Symbol.iterator]
// QUESTION Q69: no item but this type can carry the mapping of `Text.[Symbol.iterator]`, which is a trait
// implementation in Rust (N8); its name is not the conversion of a cm6 name.
pub struct TextIntoIter {
    pub(crate) cursor: TextIterator,
}

impl Iterator for TextIntoIter {
    type Item = String;

    fn next(&mut self) -> Option<String> {
        todo!()
    }
}

/// Which input a document or an insertion is given as: cm6's `string | Text` (`EditorStateConfig.doc`,
/// the `insert` of a change, `EditorState.replaceSelection`). A string is split into lines where it is used, on
/// `\r\n?|\n` or on the state's line separator (D2).
///
/// ferrum-only: cm6's union string | Text, see D14
// QUESTION Q62: the name of this type and of its variants is not given by the design or a decision.
#[derive(Clone, Debug)]
pub enum TextSpec {
    /// A string, split into lines where it is used.
    ///
    /// ferrum-only: the string member of cm6's union, see D14
    String(String),
    /// A document, used as it is.
    ///
    /// ferrum-only: the Text member of cm6's union, see D14
    Text(Text),
}

impl From<&str> for TextSpec {
    fn from(s: &str) -> TextSpec {
        todo!()
    }
}

impl From<String> for TextSpec {
    fn from(s: String) -> TextSpec {
        todo!()
    }
}

impl From<Text> for TextSpec {
    fn from(t: Text) -> TextSpec {
        todo!()
    }
}
