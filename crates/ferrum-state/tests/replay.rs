//! The fixture replayer of `ferrum-state` (`docs/parity/ferrum-state/design.md` section 10, `plan.md` "The
//! replayer"): the language of `tools/cm6/program.ts` (`lang`), the conversion of positions (`convert`), the driver
//! that runs every fixture file through its chunk's ops and writes the report (`driver`), and one module per chunk.
#![allow(
    dead_code,
    reason = "the core's interface to the chunk modules, which use it as each unit registers its ops"
)]

/// The modules under `tests/replay/`.
mod replay {
    pub mod convert;
    pub mod driver;
    pub mod lang;
    mod rules;

    pub mod change;
    pub mod facet;
    pub mod rangeset;
    pub mod state;
    pub mod text;
}

use replay::{convert, driver};
use convert::{Converted, Excluded, text_of, utf8_to_utf16, utf16_to_utf8};

/// Every fixture of the chunks asked for (`FERRUM_REPLAY_CHUNKS`, default all) and the 48 cases of
/// `tools/cm6/lang-cases.jsonl`, compared with their recorded outputs; fails on any mismatch.
#[test]
fn replay_fixtures() {
    driver::run();
}

// The conversion functions, on literal cases (`.claude/rules/rust-crates.md` Tests 4). "é" is 2 bytes and 1 code
// unit, "中" 3 bytes and 1 unit, "😀" 4 bytes and 2 units.

#[test]
fn convert_ascii_is_the_same_number() {
    for pos in 0..=3u32 {
        assert_eq!(utf16_to_utf8("abc", f64::from(pos)), Ok(Converted::InText(pos as usize)));
        assert_eq!(utf8_to_utf16("abc", pos as usize), Ok(Converted::InText(pos as usize)));
    }
}

#[test]
fn convert_multibyte_characters() {
    let text = "aé中😀b";
    let pairs: [(u32, usize); 6] = [(0, 0), (1, 1), (2, 3), (3, 6), (5, 10), (6, 11)];
    for (units, bytes) in pairs {
        assert_eq!(utf16_to_utf8(text, f64::from(units)), Ok(Converted::InText(bytes)), "unit {units}");
        assert_eq!(utf8_to_utf16(text, bytes), Ok(Converted::InText(units as usize)), "byte {bytes}");
    }
}

#[test]
fn convert_inside_a_character_has_no_counterpart() {
    // between the two halves of the pair of "😀"
    assert_eq!(utf16_to_utf8("a😀b", 2.0), Err(Excluded::InsideChar));
    assert_eq!(Excluded::InsideChar.reason(), "char");
    for byte in [2, 3, 4] {
        assert_eq!(utf8_to_utf16("a😀b", byte), Err(Excluded::InsideChar), "byte {byte}");
    }
    assert_eq!(utf8_to_utf16("é", 1), Err(Excluded::InsideChar));
}

#[test]
fn convert_beyond_the_end_as_over_filler() {
    // "aé" is 2 units and 3 bytes; 2 past its end is 4 units and 5 bytes
    assert_eq!(utf16_to_utf8("aé", 4.0), Ok(Converted::BeyondEnd(5)));
    assert_eq!(utf8_to_utf16("aé", 5), Ok(Converted::BeyondEnd(4)));
    assert_eq!(utf16_to_utf8("", 1.0), Ok(Converted::BeyondEnd(1)));
    assert_eq!(Converted::BeyondEnd(5).get(), 5);
}

#[test]
fn convert_not_an_integer_or_negative_is_excluded_by_type() {
    for pos in [-1.0, 0.5, f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
        assert_eq!(utf16_to_utf8("abc", pos), Err(Excluded::Type), "pos {pos}");
    }
    assert_eq!(Excluded::Type.reason(), "type");
    // -0 is the integer 0
    assert_eq!(utf16_to_utf8("abc", -0.0), Ok(Converted::InText(0)));
}

#[test]
fn convert_a_string_with_a_lone_surrogate_is_excluded_by_type() {
    assert_eq!(text_of(&[0x61, 0xD83D]), Err(Excluded::Type));
    assert_eq!(text_of(&[0x61, 0xD83D, 0xDE00]), Ok("a😀".to_string()));
}
