//! The cases of `mirrors/cm6/state/test/test-charcategory.ts`, ported (`.claude/rules/rust-crates.md` Tests 1 to 4),
//! with cm6's helper `mk` mirrored and tested.

use ferrum_state::{CharCategory, EditorState, EditorStateConfig, Extension};

/// `mk(...extensions)`: a state with these extensions.
fn mk(extensions: Vec<Extension>) -> EditorState {
    EditorState::create(EditorStateConfig { extensions: extensions.into(), ..EditorStateConfig::default() })
}

#[test]
fn helper_mk_creates_a_state_with_an_empty_document() {
    assert_eq!(mk(vec![]).doc().len(), 0);
}

#[test]
fn test_cm6_charcategory_01_categorises_into_alphanumeric() {
    let st = mk(vec![]);
    assert_eq!(st.char_categorizer(0)("1"), CharCategory::Word);
    assert_eq!(st.char_categorizer(0)("a"), CharCategory::Word);
}

#[test]
fn test_cm6_charcategory_02_categorises_into_whitespace() {
    let st = mk(vec![]);
    assert_eq!(st.char_categorizer(0)(" "), CharCategory::Space);
}

#[test]
fn test_cm6_charcategory_03_categorises_into_other() {
    let st = mk(vec![]);
    assert_eq!(st.char_categorizer(0)("/"), CharCategory::Other);
    assert_eq!(st.char_categorizer(0)("<"), CharCategory::Other);
}
