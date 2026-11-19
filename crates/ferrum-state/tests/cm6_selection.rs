//! The cases of `mirrors/cm6/state/test/test-selection.ts`, ported (`.claude/rules/rust-crates.md` Tests 1 to 4). No
//! case holds a document: positions are plain numbers, the same in bytes (D1) and in cm6's UTF-16 code units.
//!
//! cm6's `EditorSelection.range(anchor, head)` and `EditorSelection.create(ranges)` leave out parameters whose
//! defaults the Rust caller writes (D14): the goal column and bidi level absent, `assoc` 0, the main index 0.

use ferrum_state::EditorSelection;

// literal 0: D14: cm6's `EditorSelection.range(anchor, head)` omits `assoc`, whose default 0 the caller writes
#[test]
fn test_cm6_selection_01_stores_ranges_with_a_primary_range() {
    let sel = EditorSelection::create(
        &[
            EditorSelection::range(0, 1, None, None, 0),
            EditorSelection::range(3, 2, None, None, 0),
            EditorSelection::range(4, 5, None, None, 0),
        ],
        1,
    );
    assert_eq!(sel.main().from(), 2);
    assert_eq!(sel.main().to(), 3);
    assert_eq!(sel.main().anchor(), 3);
    assert_eq!(sel.main().head(), 2);
    assert_eq!(
        sel.ranges().iter().map(|r| r.anchor().to_string() + "/" + &r.head().to_string()).collect::<Vec<_>>().join(","),
        "0/1,3/2,4/5"
    );
}

// literal 0: D14: cm6's `EditorSelection.range(anchor, head)` omits `assoc` and `create(ranges)` the main index, whose
// default 0 the caller writes
#[test]
fn test_cm6_selection_02_merges_and_sorts_ranges_when_normalizing() {
    let sel = EditorSelection::create(
        &[
            EditorSelection::range(10, 12, None, None, 0),
            EditorSelection::range(6, 7, None, None, 0),
            EditorSelection::range(4, 5, None, None, 0),
            EditorSelection::range(3, 4, None, None, 0),
            EditorSelection::range(0, 6, None, None, 0),
            EditorSelection::range(7, 8, None, None, 0),
            EditorSelection::range(9, 13, None, None, 0),
            EditorSelection::range(13, 14, None, None, 0),
        ],
        0,
    );
    assert_eq!(
        sel.ranges().iter().map(|r| r.anchor().to_string() + "/" + &r.head().to_string()).collect::<Vec<_>>().join(","),
        "0/6,6/7,7/8,9/13,13/14"
    );
}

// literal 0: D14: cm6's `EditorSelection.range(anchor, head)` omits `assoc` and `create(ranges)` the main index, whose
// default 0 the caller writes
#[test]
fn test_cm6_selection_03_merges_adjacent_point_ranges_when_normalizing() {
    let sel = EditorSelection::create(
        &[
            EditorSelection::range(10, 12, None, None, 0),
            EditorSelection::range(12, 12, None, None, 0),
            EditorSelection::range(12, 12, None, None, 0),
            EditorSelection::range(10, 10, None, None, 0),
            EditorSelection::range(8, 10, None, None, 0),
        ],
        0,
    );
    assert_eq!(
        sel.ranges().iter().map(|r| r.anchor().to_string() + "/" + &r.head().to_string()).collect::<Vec<_>>().join(","),
        "8/10,10/12"
    );
}

// literal 0: D14: cm6's `EditorSelection.range(anchor, head)` omits `assoc` and `create(ranges)` the main index, whose
// default 0 the caller writes
#[test]
fn test_cm6_selection_04_preserves_the_direction_of_the_last_range_when_merging_ranges() {
    let sel = EditorSelection::create(
        &[EditorSelection::range(0, 2, None, None, 0), EditorSelection::range(10, 1, None, None, 0)],
        0,
    );
    assert_eq!(
        sel.ranges().iter().map(|r| r.anchor().to_string() + "/" + &r.head().to_string()).collect::<Vec<_>>().join(","),
        "10/0"
    );
}
