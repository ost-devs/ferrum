# Verified cm6 facts

<!-- One line per fact: fact. mirrors/<path>:<line>, YYYY-MM-DD, mirror commit. -->
- ChangeDesc: `length` = doc length before (sum of sections), `newLength` after, `empty` = no actual changes (length may be >0); `toString()` is @internal, format "len[:ins]" space-separated, tests compare literals. `mirrors/cm6/state/src/change.ts:34,41,51,157`, 2026-11-09, state 651084c.
- Text has no instance `empty` (only static `Text.empty`); `Text.eq` = content equality; `toString()` = full doc via sliceString(0). Line.length excludes the break. `mirrors/cm6/state/src/text.ts:33,86,132,160,577`, 2026-11-09, state 651084c.
- RangeSet: public `size` = number of ranges; `length`/`isEmpty` are @internal; static `eq(old,new,from=0,to?)` and `compare`; RangeValue.eq default identity. `mirrors/cm6/state/src/rangeset.ts:11,246,252,366,389,467`, 2026-11-09, state 651084c.
- Default `eq` returns false for WidgetType and GutterMarker (their `compare` is @internal: identity or same constructor + eq); Decoration.eq abstract; LayerMarker.eq required. `mirrors/cm6/view/src/decoration.ts:117,127,222`, `gutter.ts:14,19`, `layer.ts:21`, 2026-11-09, view 7b7882d.
