# Hazards of chunk `facet`, ferrum-state (tools/conf_check.py hazards)

Each hazard of a behavior of the chunk's items, with its id (`<behavior id>:h<n>`, the id of the verifier's `hazard`
line), the behavior's text, its item's decision rows, and every check that names the behavior: fixtures with their
result at the hand-off (`equal`, `part`, `none`), the text classes and ops of the compared ones, ported cm6 cases,
written tests with `// covers:`. Whether a check exercises the hazard is the verifier's reading.

## `state.Facet.B1` (Facet, `state.cm6.036`)
- text: Input: two facets defined with identical configurations. Result: they are distinct facets: providers of one never contribute to the other, and each has its own id and default. Facet identity is object identity: the facet's numeric id (from the module counter) is the key under which a configuration stores its providers and address.
- `state.Facet.B1:h1`: module-level counter `nextID` shared by Facet, FacetProvider and StateField (mirrors/cm6/state/src/facet.ts:4, :45, :140, :312): global mutable state; ids are the keys of `Configuration.address` and `facets` (mirrors/cm6/state/src/facet.ts:457-459)
- decision rows of the item: state.cm6.036.d1, state.cm6.036.d2
- fixtures (1 compared of 1; equal 1): F0001 equal
- compared fixtures by text class: ascii 1
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.Facet.B2` (Facet, `state.cm6.036`)
- text: Input: reading a facet that has no provider in the state's configuration. Result: `facet.default`, the value `combine([])` returned when the facet was defined: for a facet without `combine` an empty array, for a combining facet whatever it returns for []. It is the very same object for every state and every read (the default array of a no-combine facet is shared by all states; mutating it would change every state's reading).
- `state.Facet.B2:h1`: shared mutable default object: the same `default` object is returned for every state that lacks the facet (mirrors/cm6/state/src/facet.ts:61, mirrors/cm6/state/src/state.ts:196); callers compare it with `===` (e.g. F0002 `same: true` across states)
- decision rows of the item: state.cm6.036.d1, state.cm6.036.d2
- fixtures (2 compared of 2; equal 2): F0002 equal, F0003 equal
- compared fixtures by text class: ascii 2
- ops they run: create, define, same, scenario, state.facet
- ported cases: test-facet#04 (test_cm6_facet_04_returns_an_empty_array_for_absent_facet); test-facet#09 (test_cm6_facet_09_can_handle_dependencies_on_facets_that_aren_t_present_in_the_state); test-facet#15 (test_cm6_facet_15_survives_reconfiguration)
- written tests: none

## `state.Facet.B4` (Facet, `state.cm6.036`)
- text: Input: a facet with at least one computed provider (`compute`, `computeN`, `from`). Result: it gets a dynamic slot placed after its providers; its inputs are, in provider order, each static provider's value, each `compute` provider's current input and the elements of each `computeN` provider's array; `combine` is called at state creation, whenever at least one dynamic provider's input changed in a transaction, and on a reconfiguration as state.Facet.B8 states, and the new output replaces the old only when `compare(new, old)` is false (otherwise the old object is kept and the slot reports no change, so dependents do not recompute).
- `state.Facet.B4:h1`: identity: the kept old output is the same object (`===`) as before (mirrors/cm6/state/src/facet.ts:238)
- decision rows of the item: state.cm6.036.d1, state.cm6.036.d2
- fixtures (65 compared of 65; equal 65): F0005 equal, F0006 equal, F5062 equal, F5063 equal, F5064 equal, F5065 equal, F5066 equal, F5067 equal, ... (57 more in the behavior's row)
- compared fixtures by text class: empty 25, ascii 65, bmp 11, astral 18, crlf 7, lone cr 8, u2028 11
- ops they run: scenario
- ported cases: test-facet#07 (test_cm6_facet_07_supports_dynamic_facet); test-facet#14 (test_cm6_facet_14_works_with_a_dynamic_combined_facet)
- written tests: none

## `state.Facet.B6` (Facet, `state.cm6.036`)
- text: Input: a configuration with several fields and computed facets. Result: a new state computes its slots in a fixed order: all fields first, in final extension order (precedence buckets, then flattened order); then the facets with dynamic slots in ascending facet id, i.e. the order in which the facets were defined in the process, each facet's computed providers (in provider order) before the facet itself. A slot that another slot's function reads is computed earlier, on demand. The order is visible through side effects of create/update/getter functions (see Q32).
- `state.Facet.B6:h1`: integer-keyed object iteration order: `for (let id in facets)` visits facet ids in ascending numeric order (mirrors/cm6/state/src/facet.ts:489)
- `state.Facet.B6:h2`: module-level counter `nextID` shared by Facet, FacetProvider and StateField (mirrors/cm6/state/src/facet.ts:4, :45, :140, :312): global mutable state; ids are the keys of `Configuration.address` and `facets` (mirrors/cm6/state/src/facet.ts:457-459)
- `state.Facet.B6:h3`: re-entrant computation: a slot function reading another slot computes it on demand (mirrors/cm6/state/src/facet.ts:566-575)
- decision rows of the item: state.cm6.036.d1, state.cm6.036.d2
- fixtures (3 compared of 3; equal 3): F0007 equal, F0008 equal, F0009 equal
- compared fixtures by text class: ascii 3
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.Facet.B7` (Facet, `state.cm6.036`)
- text: Input: a reconfiguration (StateEffect.reconfigure, StateEffect.appendConfig or a compartment reconfigure) of a facet whose providers are all static. Result: when the new provider list is the identical list of provider objects in the same order as before, the previous output object is reused without calling `combine`; otherwise `combine` is called and, when `compare(new, previous)` is true, the previous output object is kept. "Previous" is the old state's reading, i.e. the facet's default when the facet had no provider before, so a newly provided value equal under `compare` to the default yields the default object itself.
- `state.Facet.B7:h1`: provider identity: `sameArray(oldProviders, providers)` compares provider objects with `===` (mirrors/cm6/state/src/facet.ts:494, :131-133)
- `state.Facet.B7:h2`: identity of outputs observable with `===` (mirrors/cm6/state/src/facet.ts:495, :498)
- decision rows of the item: state.cm6.036.d1, state.cm6.036.d2
- fixtures (6 compared of 6; equal 6): F0010 equal, F0011 equal, F0012 equal, F7000 equal, F7001 equal, F7003 equal
- compared fixtures by text class: ascii 6
- ops they run: scenario
- ported cases: test-facet#17 (test_cm6_facet_17_preserves_static_facets_across_reconfiguration)
- written tests: none

## `state.Facet.B8` (Facet, `state.cm6.036`)
- text: Input: a reconfiguration of a facet with a dynamic slot. Result: all its providers are brought up to date first; when the old configuration had providers for this facet, none of them reported a change, and the provider list is the identical list of objects, the old output is kept without calling `combine`; otherwise `combine` runs and the old output (the default when the facet was absent before) is kept when `compare(new, old)` is true. A computed provider new to the configuration always reports a change, so adding one runs `combine`.
- `state.Facet.B8:h1`: provider identity (`sameArray` on provider objects, mirrors/cm6/state/src/facet.ts:245)
- decision rows of the item: state.cm6.036.d1, state.cm6.036.d2
- fixtures (4 compared of 4; equal 4): F0013 equal, F0014 equal, F0015 equal, F7006 equal
- compared fixtures by text class: ascii 4
- ops they run: scenario
- ported cases: test-facet#15 (test_cm6_facet_15_survives_reconfiguration); test-facet#16 (test_cm6_facet_16_survives_unrelated_reconfiguration_even_without_deep_compare); test-facet#21 (test_cm6_facet_21_updates_facets_computed_from_static_values_on_reconfigure); test-facet#22 (test_cm6_facet_22_preserves_dynamic_facet_values_when_dependencies_stay_the_same)
- written tests: none

## `state.Facet.B9` (Facet, `state.cm6.036`)
- text: Input: slot functions that depend on each other in a cycle: two computed facets reading each other, a field whose create reads itself, two fields whose updates read each other through `tr.state`, or a computed provider that declares its own facet as a dependency. Result: `Error("Cyclic dependency between fields and/or facets")` thrown when the cycle is entered: at state creation for reads made during creation, or at the first transaction for a cycle that only the update path enters (a provider listing its own facet as a dependency is accepted at creation and throws on the first transaction, F0190).
- `state.Facet.B9:h1`: throw: Error("Cyclic dependency between fields and/or facets") (mirrors/cm6/state/src/facet.ts:570); condition: a slot is read while it is being computed; protects against infinite recursion; a caller cannot check it in advance
- `state.Facet.B9:h2`: re-entrancy: slots are computed on demand from inside other slots' functions (mirrors/cm6/state/src/facet.ts:566-575)
- decision rows of the item: state.cm6.036.d1, state.cm6.036.d2
- fixtures (4 compared of 4; equal 4): F0016 equal, F0017 equal, F0018 equal, F0190 equal
- compared fixtures by text class: ascii 4
- ops they run: scenario
- ported cases: test-facet#20 (test_cm6_facet_20_errors_on_cyclic_dependencies)
- written tests: none

## `state.Facet.B10` (Facet, `state.cm6.036`)
- text: Input: a field create/update function, a computed getter or a combine function that throws while a state is built. Result: the exception propagates out of `EditorState.create` or out of `tr.state`; nothing catches it. For a transaction, the partly built state stays attached to the transaction: a second `tr.state` returns it, and reading a slot left in the Computing status throws the cyclic-dependency error (see Q30).
- `state.Facet.B10:h1`: exception safety: slot status stays Computing after a throw (mirrors/cm6/state/src/facet.ts:572-574) and `tr._state` is set before computation (mirrors/cm6/state/src/state.ts:58)
- decision rows of the item: state.cm6.036.d1, state.cm6.036.d2
- fixtures (2 compared of 3; equal 2, not run 1): F0019 not run, F0020 equal, F0021 equal
- compared fixtures by text class: ascii 2
- ops they run: scenario
- ported cases: none
- written tests: written_state.rs::a_second_state_of_a_transaction_whose_first_build_panicked_is_built_again

## `state.Facet.reader.B2` (Facet.reader, `state.cm6.037`)
- text: Input: a facet's reader given as a dependency of `compute`. Result: tracked exactly like the facet: the getter reruns when the facet's slot changed in a transaction, and on reconfiguration the provider keeps its input when the facet's output is the same object in the old and new state.
- `state.Facet.reader.B2:h1`: `instanceof Facet` dispatch on dependencies (mirrors/cm6/state/src/facet.ts:178)
- fixtures (1 compared of 1; equal 1): F0024 equal
- compared fixtures by text class: ascii 1
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.FacetReader.B3` (FacetReader, `state.cm6.044`)
- text: Input: a plain object `{id, default}` cast to a reader (not a Facet). Result: `EditorState.facet` reads only `id` and `default`, so such an object reads the facet with that id when it is in the configuration and returns its `default` otherwise (F0025: `[1]` and "D"). Used as a compute dependency, the reconfiguration check at facet.ts:177-179 would count it as unchanged because it is not `instanceof Facet` (deduction from the code, not run).
- `state.FacetReader.B3:h1`: duck typing: `EditorState.facet` takes any object with `id` and `default`
- `state.FacetReader.B3:h2`: `instanceof` dispatch on compute dependencies
- decision rows of the item: state.cm6.044.d1
- fixtures (0 compared of 1; not run 1): F0025 not run
- ported cases: none
- written tests: none
- hand-off: accepted: a row of class form, state.cm6.044.d1

## `state.Facet^define.B3` (Facet^define, `state.cm6.038`)
- text: Input: any configuration. Result: `combine([])` is called exactly once during `define`, before any state exists, to compute the default; if it throws, `define` throws the same exception and no facet is created.
- `state.Facet^define.B3:h1`: throw propagated from user combine at definition time
- fixtures (2 compared of 2; equal 2): F0027 equal, F0028 equal
- compared fixtures by text class: ascii 2
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.Facet^define.B4` (Facet^define, `state.cm6.038`)
- text: Input: `combine: undefined` given explicitly (as `defineLanguageFacet` does when it has no base data). Result: treated as absent: identity combine, `sameArray` output comparison.
- `state.Facet^define.B4:h1`: optional field tested by truthiness: any falsy `combine` counts as absent
- fixtures (1 compared of 1; equal 1): F0029 equal
- compared fixtures by text class: ascii 1
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.Facet^define.B5` (Facet^define, `state.cm6.038`)
- text: Input: `static` set to any truthy value (e.g. 1) or falsy value (e.g. 0). Result: coerced with `!!`: truthy makes the facet static (compute/computeN throw), falsy does not.
- `state.Facet^define.B5:h1`: `!!` coercion of an optional flag
- fixtures (2 compared of 2; equal 2): F0030 equal, F0031 equal
- compared fixtures by text class: ascii 2
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.Facet.of.B1` (Facet.of, `state.cm6.039`)
- text: Input: `facet.of(value)` called several times, also with equal values. Result: every call returns a new provider object; providers with equal values are distinct and all contribute (`[of(1), of(1)]` reads [1, 1]).
- `state.Facet.of.B1:h1`: module-level counter `nextID` shared by Facet, FacetProvider and StateField (mirrors/cm6/state/src/facet.ts:4, :45, :140, :312): global mutable state; ids are the keys of `Configuration.address` and `facets` (mirrors/cm6/state/src/facet.ts:457-459)
- fixtures (2 compared of 2; equal 2): F0033 equal, F0037 equal
- compared fixtures by text class: ascii 2
- ops they run: define, ext, not, same, scenario
- ported cases: test-facet#01 (test_cm6_facet_01_allows_querying_of_facets); test-facet#02 (test_cm6_facet_02_includes_sub_extenders)
- written tests: none

## `state.Facet.of.B2` (Facet.of, `state.cm6.039`)
- text: Input: the same provider object listed several times in a configuration. Result: it contributes one input, at the first position where it occurs at its highest precedence (see state.Extension.B6).
- `state.Facet.of.B2:h1`: deduplication by object identity through a `Map<Extension, number>` (mirrors/cm6/state/src/facet.ts:522)
- fixtures (1 compared of 1; equal 1): F0034 equal
- compared fixtures by text class: ascii 1
- ops they run: scenario
- ported cases: test-facet#03 (test_cm6_facet_03_only_includes_duplicated_extensions_once)
- written tests: none

## `state.Facet.of.B3` (Facet.of, `state.cm6.039`)
- text: Input: any value, including undefined, null, NaN or an array. Result: stored as given, without copying, and passed to `combine` as one input: an array value is one input (not spread); `undefined` and `null` are inputs like any other; an object input is the same object (`===`) in the output array.
- `state.Facet.of.B3:h1`: aliasing: provided objects are shared, not copied
- fixtures (2 compared of 2; equal 2): F0035 equal, F0036 equal
- compared fixtures by text class: ascii 2
- ops they run: create, define, item, object, same, scenario, state.facet
- ported cases: none
- written tests: none

## `state.Facet.compute.B1` (Facet.compute, `state.cm6.040`)
- text: Input: `compute(deps, get)` on a static facet. Result: `Error("Can't compute a static facet")` thrown by the call itself, before any state is involved.
- `state.Facet.compute.B1:h1`: throw: Error("Can't compute a static facet"); condition: facet defined with a truthy `static`; checkable in advance only by knowing the facet's definition (no public accessor for the flag)
- fixtures (2 compared of 2; equal 2): F0040 equal, F0041 equal
- compared fixtures by text class: ascii 2
- ops they run: define, ext, scenario
- ported cases: none
- written tests: none

## `state.Facet.compute.B2` (Facet.compute, `state.cm6.040`)
- text: Input: a computed provider in the configuration of a new state. Result: the getter is called once during construction with the state under construction (doc, selection and other slots of the new state; reading another slot computes it first) and its result is the provider's input.
- `state.Facet.compute.B2:h1`: the getter receives the partly built state (Q16)
- fixtures (1 compared of 1; equal 1): F0042 equal
- compared fixtures by text class: ascii 1
- ops they run: scenario
- ported cases: test-facet#07 (test_cm6_facet_07_supports_dynamic_facet); test-facet#09 (test_cm6_facet_09_can_handle_dependencies_on_facets_that_aren_t_present_in_the_state)
- written tests: none

## `state.Facet.compute.B5` (Facet.compute, `state.cm6.040`)
- text: Input: a facet or field dependency. Result: tracked only when that facet or field has a dynamic slot in the configuration: the getter reruns when the dependency's slot reported a change in this transaction (a field whose `compare` said unequal, a dynamic facet whose output was replaced). A dependency that is static in the configuration (a facet with only `of` providers) or absent from it is never tracked, so the getter never reruns for it on a transaction; a provider listing its own facet as a dependency makes a cycle (state.Facet.B9).
- `state.Facet.compute.B5:h1`: `?? 1` default makes a dependency missing from the address map look static (mirrors/cm6/state/src/facet.ts:155)
- fixtures (65 compared of 65; equal 65): F0047 equal, F0048 equal, F0049 equal, F0190 equal, F5062 equal, F5063 equal, F5064 equal, F5065 equal, ... (57 more in the behavior's row)
- compared fixtures by text class: empty 25, ascii 65, bmp 11, astral 18, crlf 7, lone cr 8, u2028 11
- ops they run: scenario
- ported cases: test-facet#08 (test_cm6_facet_08_only_recomputes_a_facet_value_when_necessary); test-facet#09 (test_cm6_facet_09_can_handle_dependencies_on_facets_that_aren_t_present_in_the_state)
- written tests: none

## `state.Facet.compute.B6` (Facet.compute, `state.cm6.040`)
- text: Input: a rerun getter. Result: the new input is compared with `compareInput(new, old)`; when equal, the old input object is kept and the provider reports no change (the facet's combine does not run for it); otherwise the new input is stored and the facet is recombined. With the default `===`, a getter returning a fresh object or array counts as a change every time it reruns.
- `state.Facet.compute.B6:h1`: argument order: compareInput(newValue, oldValue)
- fixtures (63 compared of 63; equal 63): F0050 equal, F0051 equal, F5062 equal, F5063 equal, F5064 equal, F5065 equal, F5066 equal, F5067 equal, ... (55 more in the behavior's row)
- compared fixtures by text class: empty 25, ascii 63, bmp 11, astral 18, crlf 7, lone cr 8, u2028 11
- ops they run: scenario
- ported cases: test-facet#10 (test_cm6_facet_10_can_specify_a_dependency_on_the_document); test-facet#11 (test_cm6_facet_11_can_specify_a_dependency_on_the_selection)
- written tests: none

## `state.Facet.compute.B8` (Facet.compute, `state.cm6.040`)
- text: Input: a reconfiguration in which the provider object stays in the configuration. Result: the old input is kept, without calling the getter, when every dependency is unchanged in this sense: a facet dependency's output is the same object (`===`) in the old and the new state, a field dependency's value is `==` (absent counts as undefined), and `"doc"`/`"selection"` always count as unchanged (the doc and selection are not yet updated at this stage). Otherwise the getter runs and the old input is still kept when `compareInput(new, old)` is true. The dependencies are checked in the order of the provider's dependency list, and the check stops at the first one that is not unchanged (`every`); reading a facet or field dependency for the check computes that dependency's slot in the new state when it is not computed yet. So a dependency after the first changed one is not computed by the check: its slot is computed later, when the getter reads it or when the new state's slot order reaches it. Observable as the order of getter calls: with facets defined in the order A, P, B, A static in a compartment, P computed from `[A, B]` with a getter that reads only A, and B computed from `[A]`, reconfiguring the compartment so that A's output changes calls P's getter before B's.
- `state.Facet.compute.B8:h1`: identity and loose equality: facets compared with `===`, fields with `==` (mirrors/cm6/state/src/facet.ts:178-179)
- `state.Facet.compute.B8:h2`: argument order: compare(newValue, oldValue)
- fixtures (66 compared of 66; equal 66): F0053 equal, F0054 equal, F0055 equal, F0056 equal, F5062 equal, F5063 equal, F5064 equal, F5065 equal, ... (58 more in the behavior's row)
- compared fixtures by text class: empty 25, ascii 66, bmp 11, astral 18, crlf 7, lone cr 8, u2028 11
- ops they run: scenario
- ported cases: test-facet#16 (test_cm6_facet_16_survives_unrelated_reconfiguration_even_without_deep_compare); test-facet#21 (test_cm6_facet_21_updates_facets_computed_from_static_values_on_reconfigure); test-facet#22 (test_cm6_facet_22_preserves_dynamic_facet_values_when_dependencies_stay_the_same)
- written tests: written_state.rs::a_provider_runs_again_when_a_facet_without_combine_recombines_an_equal_list_its_compare_calls_unequal

## `state.Facet.compute.B9` (Facet.compute, `state.cm6.040`)
- text: Input: a reconfiguration that adds a computed provider object that was not in the old configuration (including an equal-looking `compute` call made again). Result: its getter is called and its input counts as changed.
- `state.Facet.compute.B9:h1`: provider identity: `oldState.config.address[id]` keyed by the provider's id
- fixtures (1 compared of 1; equal 1): F0057 equal
- compared fixtures by text class: ascii 1
- ops they run: scenario
- ported cases: test-facet#15 (test_cm6_facet_15_survives_reconfiguration)
- written tests: none

## `state.Facet.compute.B11` (Facet.compute, `state.cm6.040`)
- text: Input: a getter that reads a facet or field it does not list as a dependency. Result: no tracking: the getter is not rerun when that slot changes, so the input stays stale until a listed dependency fires or the provider is recreated.
- `state.Facet.compute.B11:h1`: correctness depends on the caller declaring every dependency (doc comment at :84-86)
- fixtures (1 compared of 1; equal 1): F0059 equal
- compared fixtures by text class: ascii 1
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.Facet.computeN.B1` (Facet.computeN, `state.cm6.041`)
- text: Input: `computeN(deps, get)` on a static facet. Result: `Error("Can't compute a static facet")` thrown by the call.
- `state.Facet.computeN.B1:h1`: throw: Error("Can't compute a static facet")
- fixtures (1 compared of 1; equal 1): F0060 equal
- compared fixtures by text class: ascii 1
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.Facet.computeN.B3` (Facet.computeN, `state.cm6.041`)
- text: Input: a rerun computeN getter. Result: the new array counts as unchanged when it has the same length as the old one and `compareInput(new[i], old[i])` holds for every index; then the old array object is kept and the facet is not recombined.
- `state.Facet.computeN.B3:h1`: argument order: compareInput(new[i], old[i])
- fixtures (23 compared of 23; equal 23): F0062 equal, F0063 equal, F5065 equal, F5066 equal, F5068 equal, F5072 equal, F5076 equal, F5085 equal, ... (15 more in the behavior's row)
- compared fixtures by text class: empty 9, ascii 23, bmp 4, astral 5, crlf 3, lone cr 2, u2028 4
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.Facet.computeN.B5` (Facet.computeN, `state.cm6.041`)
- text: Input: a getter returning a non-array iterable, such as a string. Result: its elements are spread by `for...of` ("ab" contributes "a" and "b"); comparison uses `.length` and indexing.
- `state.Facet.computeN.B5:h1`: duck typing: any iterable is spread; a string spreads by code point (for...of) while `.length` counts UTF-16 units
- fixtures (0 compared of 6; not run 6): F0065 not run, F0192 not run, F6030 not run, F6031 not run, F6032 not run, F6033 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Facet.from.B4` (Facet.from, `state.cm6.042`)
- text: Input: the field is not in the state's configuration. Result: building the state throws `RangeError("Field is not present in this state")` from `EditorState.field` when the getter first runs.
- `state.Facet.from.B4:h1`: throw: RangeError("Field is not present in this state")
- fixtures (1 compared of 1; equal 1): F0070 equal
- compared fixtures by text class: ascii 1
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.StateField.B1` (StateField, `state.cm6.046`)
- text: Input: a field object included several times (directly, nested in arrays, under different precedences). Result: one slot and one value; the field is identified by object identity (its id), and every occurrence after the first at the same or lower precedence is ignored.
- `state.StateField.B1:h1`: module-level counter `nextID` shared by Facet, FacetProvider and StateField (mirrors/cm6/state/src/facet.ts:4, :45, :140, :312): global mutable state; ids are the keys of `Configuration.address` and `facets` (mirrors/cm6/state/src/facet.ts:457-459)
- `state.StateField.B1:h2`: identity: deduplication by object
- decision rows of the item: state.cm6.046.d1
- fixtures (2 compared of 2; equal 2): F0072 equal, F0073 equal
- compared fixtures by text class: ascii 2
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.StateField.B2` (StateField, `state.cm6.046`)
- text: Input: a state is created with the field. Result: the value comes from the first `init` entry registered for this field (in final extension order) when there is one, otherwise from the spec's `create`; either receives the state under construction.
- `state.StateField.B2:h1`: lookup by identity: `i.field == this` (mirrors/cm6/state/src/facet.ts:318)
- decision rows of the item: state.cm6.046.d1
- fixtures (1 compared of 1; equal 1): F0074 equal
- compared fixtures by text class: ascii 1
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.StateField.B3` (StateField, `state.cm6.046`)
- text: Input: any transaction applied to a state with the field. Result: `update(oldValue, tr)` is called; the result replaces the stored value only when `compare(oldValue, newValue)` is false (note the argument order: old first); otherwise the old object is kept and the slot reports no change.
- `state.StateField.B3:h1`: argument order: compare(old, new), the reverse of the facet comparisons
- `state.StateField.B3:h2`: identity: kept old value is the same object
- decision rows of the item: state.cm6.046.d1
- fixtures (1 compared of 1; equal 1): F0075 equal
- compared fixtures by text class: ascii 1
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.StateField.B4` (StateField, `state.cm6.046`)
- text: Input: a reconfiguring transaction. Result: before the update step, a field whose current `init` entry is a different entry object from the one in the old state is re-created with that init (and reports a change); otherwise a field that was in the old configuration keeps its old value; a field new to the configuration is created (spec `create`, or its init). Then `update` runs with the transaction as for any transaction, so a newly added field sees the transaction's effects.
- `state.StateField.B4:h1`: identity of init entries: `reInit != oldInit.find(...)` (mirrors/cm6/state/src/facet.ts:339)
- decision rows of the item: state.cm6.046.d1
- fixtures (1 compared of 1; equal 1): F0076 equal
- compared fixtures by text class: ascii 1
- ops they run: scenario
- ported cases: test-facet#18 (test_cm6_facet_18_creates_newly_added_fields_when_reconfiguring); test-facet#19 (test_cm6_facet_19_applies_effects_from_reconfiguring_transaction_to_new_fields)
- written tests: none

## `state.StateField.B5` (StateField, `state.cm6.046`)
- text: Input: a field removed from the configuration, then read, or added again later. Result: after removal `state.field(f)` throws `RangeError("Field is not present in this state")` and `state.field(f, false)` is undefined; its value is gone, and adding the field again creates it afresh (spec create, then update for that transaction).
- `state.StateField.B5:h1`: throw: RangeError("Field is not present in this state") at mirrors/cm6/state/src/state.ts:71 (EditorState.field) when the field has no address in the configuration (`this.config.address[field.id] == null`, state.ts:69-70) and `require` is truthy. `require` defaults to true only when the argument is undefined or omitted (state.ts:68), so `field(f, false)`, `field(f, null)`, `field(f, 0)` and `field(f, "")` return undefined without throwing, while `field(f, 1)` and `field(f, "x")` throw (fixtures F5184-F5192, written by oracle/cm6/facet/gapfill-field-require.ts; the same rule is state.EditorState.field.B2 and B3).
- `state.StateField.B5:h2`: `field(f, false)` returns undefined both for a missing field (F0078) and for a present field whose value is undefined (F5193, F5194: a field created with `create: () => undefined`), so it does not tell a caller whether the field is present. In state.ts the public members that consult presence without throwing are `toJSON(fields)`, which includes a property only for a present field (state.ts:212) and then calls that field's `spec.toJSON`; and catching the RangeError of `field(f)` (read from state.ts).
- decision rows of the item: state.cm6.046.d1
- fixtures (13 compared of 13; equal 13): F0077 equal, F0078 equal, F5184 equal, F5185 equal, F5186 equal, F5187 equal, F5188 equal, F5189 equal, ... (5 more in the behavior's row)
- compared fixtures by text class: empty 1, ascii 13
- ops they run: create, define, scenario, state.field
- ported cases: none
- written tests: none

## `state.StateField.B6` (StateField, `state.cm6.046`)
- text: Input: two fields defined from identical specs. Result: distinct fields with distinct values; including one does not make the other present.
- `state.StateField.B6:h1`: module-level counter `nextID` shared by Facet, FacetProvider and StateField (mirrors/cm6/state/src/facet.ts:4, :45, :140, :312): global mutable state; ids are the keys of `Configuration.address` and `facets` (mirrors/cm6/state/src/facet.ts:457-459)
- decision rows of the item: state.cm6.046.d1
- fixtures (1 compared of 1; equal 1): F0073 equal
- compared fixtures by text class: ascii 1
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.StateField.B7` (StateField, `state.cm6.046`)
- text: Input: several fields. Result: their create functions run, and on each transaction their update functions run, in final extension order (precedence buckets, then flattened order), before any computed facet slot, except when another slot reads a field earlier (on demand).
- `state.StateField.B7:h1`: order of user callbacks is observable through side effects
- decision rows of the item: state.cm6.046.d1
- fixtures (2 compared of 2; equal 2): F0007 equal, F0008 equal
- compared fixtures by text class: ascii 2
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.StateField.B8` (StateField, `state.cm6.046`)
- text: Input: a field whose update reads another field of the new state through `tr.state`. Result: the other field is updated first, on demand, whatever the registration order, and the read returns its new value.
- `state.StateField.B8:h1`: re-entrant access to the partly built state (Q16)
- decision rows of the item: state.cm6.046.d1
- fixtures (1 compared of 1; equal 1): F0079 equal
- compared fixtures by text class: ascii 1
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.StateField.init.B3` (StateField.init, `state.cm6.048`)
- text: Input: a reconfiguration that includes an `init` extension for a field already present. Result: when the init entry object differs from the one in the old configuration (a new `init(...)` call), the field is re-created with it, then updated by the transaction; when it is the same entry object (the same extension value reused), the old value is kept.
- `state.StateField.init.B3:h1`: identity of the entry object decides re-initialization
- decision rows of the item: state.cm6.048.d1
- fixtures (2 compared of 2; equal 2): F0086 equal, F0087 equal
- compared fixtures by text class: ascii 2
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.StateField.extension.B1` (StateField.extension, `state.cm6.049`)
- text: Input: `field.extension` read on any field, any number of times. Result: the field object itself: `field.extension === field`, `field.extension === field.extension`, `field.extension.extension === field`; two fields give two distinct values. The getter is an accessor on `StateField.prototype`, not an own property: `"extension" in field` is true, `Object.keys(field)` does not list it. It allocates nothing.
- `state.StateField.extension.B1:h1`: identity: the result is `===` the field, and `flatten` deduplicates by that object (`seen` Map<Extension, number>, mirrors/cm6/state/src/facet.ts:522-531)
- `state.StateField.extension.B1:h2`: prototype accessor, not an own property: JS reflection (`Object.keys`, `JSON.stringify`, spread) does not show it, `in` does
- decision rows of the item: state.cm6.049.d1
- fixtures (2 compared of 2; part 2): F0106 part, F6001 part
- compared fixtures by text class: ascii 2
- ops they run: define, ext, extension, extension.shape, item, not, same
- ported cases: none
- written tests: none

## `state.StateField.extension.B2` (StateField.extension, `state.cm6.049`)
- text: Input: a configuration holding the field and its `extension` together, in either order (`[field, field.extension]`, `[field.extension, field]`), `field.extension` twice, or `field.extension` beside `field.init(create)`. Result: one extension value met twice: the field gets one slot, its `create` runs once (or the init's create instead, F6005), `update` runs once per transaction, and `state.field(field)` returns that single value (1, then 2 after one transaction with `create: () => 1` and `update: v => v + 1`).
- `state.StateField.extension.B2:h1`: identity: the second occurrence is skipped because it is the same object at the same precedence (`known <= prec`, mirrors/cm6/state/src/facet.ts:526)
- decision rows of the item: state.cm6.049.d1
- fixtures (4 compared of 4; equal 4): F6002 equal, F6003 equal, F6004 equal, F6005 equal
- compared fixtures by text class: ascii 4
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.StateField.extension.B3` (StateField.extension, `state.cm6.049`)
- text: Input: `Prec.<level>(field.extension)` beside the field itself, which sits at default level after another field `g`. Result: the field is placed once, at the higher of the two levels: with `highest` or `high` it moves to that level (creation and update order f then g, F6006, F6007), with `default`, `low` or `lowest` it stays at its default position (order g then f, F6008-F6010); `Prec.high(field.extension)` listed before the field also puts it at high (F6011). `create` runs once in every case. The field's provided extensions move with it: `provide: () => n.of("P")` beside `n.of("a")` at default gives `n` = ["P", "a"] (F6012).
- `state.StateField.extension.B3:h1`: identity: the move to a higher level finds the earlier placement with `indexOf` and removes it with `splice` (mirrors/cm6/state/src/facet.ts:527-528)
- `state.StateField.extension.B3:h2`: order of user callbacks (create, update, provide) is observable
- decision rows of the item: state.cm6.049.d1
- fixtures (7 compared of 7; equal 7): F6006 equal, F6007 equal, F6008 equal, F6009 equal, F6010 equal, F6011 equal, F6012 equal
- compared fixtures by text class: ascii 7
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.StateField.extension.B4` (StateField.extension, `state.cm6.049`)
- text: Input: a field reached only through its `extension`: as the whole configuration (`extensions: field.extension`), nested in arrays, inside an object wrapper `{extension: field.extension}`, appended with `StateEffect.appendConfig`, or as a compartment's new content. Result: exactly the field: its `create` gives the initial value, `update` runs on every transaction, its `provide` result (called once, at `define`, before any state) is included (`n.from(field)` reads [1], then [2]); added by an effect, the field is created and then updated in that transaction (`state.field(field, false)` undefined before, 2 after), as state.StateField.B4 states for the field itself.
- `state.StateField.extension.B4:h1`: identity: the value included is the field object itself; any code keyed on the field (`state.field(field)`, `Configuration.address[field.id]`) finds it
- decision rows of the item: state.cm6.049.d1
- fixtures (5 compared of 5; equal 5): F6013 equal, F6014 equal, F6015 equal, F6016 equal, F6017 equal
- compared fixtures by text class: ascii 5
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.StateField.extension.B5` (StateField.extension, `state.cm6.049`)
- text: Input: code that recognizes extension values at run time by reading `.extension`, as the LSPClient constructor does with each entry of `config.extensions` (`Array.isArray(ext) || ext.extension` keeps it, otherwise `ext.editorExtension` is kept, otherwise the entry is dropped). Result: a field, and `field.extension`, are kept as extensions because the getter returns a truthy value (the field); an `{editorExtension: g}` object gives `g`, `{}` is dropped; the kept list, nested as `LSPClient.plugin` nests it, enables the fields (F6018: kinds ["kept", "kept", "editorExtension", "kept", "dropped"], field values 1 and 2). The condition is copied from mirrors/cm6/lsp-client/src/client.ts:264-265, since @codemirror/lsp-client is not in the harness.
- `state.StateField.extension.B5:h1`: duck typing: truthiness of an untyped property read decides whether a value is an extension (mirrors/cm6/lsp-client/src/client.ts:264)
- `state.StateField.extension.B5:h2`: union-typed parameter: `readonly (Extension | LSPClientExtension)[]` (mirrors/cm6/lsp-client/src/client.ts:205)
- decision rows of the item: state.cm6.049.d1
- fixtures (1 compared of 1; equal 1): F6018 equal
- compared fixtures by text class: ascii 1
- ops they run: create, define, item, lspKeep, state.facet, state.field
- ported cases: none
- written tests: none

## `state.StateField.extension.B6` (StateField.extension, `state.cm6.049`)
- text: Input: a field of this package whose own `extension` property is shadowed (`Object.defineProperty(field, "extension", {value: null})`), included in a configuration. Result: still enabled (`state.field(field)` gives 1): `flatten` recognizes this package's fields by `instanceof StateField` before it reads `.extension`, so it never consults the getter for them.
- `state.StateField.extension.B6:h1`: prototype dispatch: `instanceof` tests in a fixed order (Array.isArray, CompartmentInstance, PrecExtension, StateField, FacetProvider) precede duck typing (mirrors/cm6/state/src/facet.ts:532-549)
- decision rows of the item: state.cm6.049.d1
- fixtures (0 compared of 1; not run 1): F6019 not run
- ported cases: none
- written tests: none
- hand-off: accepted: a row of class form, state.cm6.049.d1

## `state.StateField.extension.B7` (StateField.extension, `state.cm6.049`)
- text: Input: a field defined by a second loaded copy of @codemirror/state, included in a state of this copy, directly, as `[field.extension]` or inside `{extension: field}`. Result: `instanceof StateField` is false, `flatten` reads `.extension` at facet.ts:549, the getter returns the field itself, and `content == ext` throws `Error("Unrecognized extension value in extension set ([object Object]). This sometimes happens because multiple instances of @codemirror/state are loaded, breaking instanceof checks.")` (F6021-F6023). The same field in a state of its own copy works (F6024).
- `state.StateField.extension.B7:h1`: identity: `content == ext` decides the second message (mirrors/cm6/state/src/facet.ts:551)
- `state.StateField.extension.B7:h2`: `instanceof` fails across package copies
- `state.StateField.extension.B7:h3`: throw: Error at mirrors/cm6/state/src/facet.ts:551; condition: a value whose `extension` is itself and that matches no `instanceof` test of this copy; protects against infinite recursion; a caller can check `x instanceof StateField` in advance
- decision rows of the item: state.cm6.049.d1
- fixtures (0 compared of 5; not run 5): F6020 not run, F6021 not run, F6022 not run, F6023 not run, F6024 not run
- ported cases: none
- written tests: none
- hand-off: accepted: a row of class form, state.cm6.049.d1

## `state.Extension.B2` (Extension, `state.cm6.050`)
- text: Input: an object that is not a built-in extension but has a truthy `extension` property different from itself (e.g. LanguageSupport, a ViewPlugin without argument). Result: its `extension` value is flattened in its place, recursively, at the current precedence.
- `state.Extension.B2:h1`: duck typing on `.extension`
- fixtures (1 compared of 1; equal 1): F0091 equal
- compared fixtures by text class: ascii 1
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.Extension.B3` (Extension, `state.cm6.050`)
- text: Input: a value with no usable `extension` property: a plain object, a number, a string, a function, `{extension: null}`, or a ViewPlugin that needs an argument (its `extension` is null). Result: `Error("Unrecognized extension value in extension set (" + String(value) + ").")`, the value converted with JS string conversion: `[object Object]` for objects, the digits for numbers, the string itself, the function's source text for functions.
- `state.Extension.B3:h1`: throw: Error("Unrecognized extension value in extension set (...)."); message embeds JS `${value}` conversion (function source text)
- fixtures (0 compared of 5; not run 5): F0092 not run, F0093 not run, F0094 not run, F0095 not run, F0096 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Extension.B4` (Extension, `state.cm6.050`)
- text: Input: an object whose `extension` property is the object itself but which is not one of this package's classes (typically an extension built by a second copy of @codemirror/state). Result: `Error` with the same message plus " This sometimes happens because multiple instances of @codemirror/state are loaded, breaking instanceof checks."
- `state.Extension.B4:h1`: `instanceof` dispatch fails across package copies
- fixtures (0 compared of 1; not run 1): F0097 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Extension.B5` (Extension, `state.cm6.050`)
- text: Input: `null` or `undefined` inside an extension array. Result: `TypeError` from reading `.extension` (V8: "Cannot read properties of null (reading 'extension')"). At the top level, `EditorState.create({extensions: null})` treats it as no extensions (`config.extensions || []`).
- `state.Extension.B5:h1`: engine-specific TypeError message
- fixtures (1 compared of 3; equal 1, not run 2): F0098 not run, F0099 not run, F0100 equal
- compared fixtures by text class: ascii 1
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.Extension.B6` (Extension, `state.cm6.050`)
- text: Input: the same extension object (provider, field, array, wrapper object, compartment instance or Prec wrapper) met more than once. Result: an occurrence at the same or a lower precedence than one already seen is skipped (the first position is kept); an occurrence at a higher precedence removes the earlier placement and places it again at the current point of the traversal in the higher bucket, together with its contents (an array's elements, a field's provided extensions).
- `state.Extension.B6:h1`: `Map<Extension, number>` keyed by object identity (mirrors/cm6/state/src/facet.ts:522); `indexOf` + `splice` to move (mirrors/cm6/state/src/facet.ts:527-528)
- fixtures (67 compared of 67; equal 67): F0034 equal, F0101 equal, F0102 equal, F0103 equal, F0104 equal, F0105 equal, F5001 equal, F5002 equal, ... (59 more in the behavior's row)
- compared fixtures by text class: ascii 67
- ops they run: scenario
- ported cases: test-facet#03 (test_cm6_facet_03_only_includes_duplicated_extensions_once)
- written tests: none

## `state.Prec.B7` (Prec, `state.cm6.051`)
- text: Input: fields under different levels. Result: field creation and update order follows the same level-then-position order.
- `state.Prec.B7:h1`: callback order observable
- decision rows of the item: state.cm6.051.d1
- fixtures (2 compared of 2; equal 2): F0008 equal, F0117 equal
- compared fixtures by text class: ascii 2
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.Compartment.B1` (Compartment, `state.cm6.057`)
- text: Input: a compartment instance in a configuration whose compartment already has stored content. Result: the stored content is used instead of the instance's own content; stored content persists across every reconfiguration that still reaches the compartment, including `StateEffect.reconfigure` with a new `c.of(X)` and `appendConfig` (documented: reconfigure "does not reset the content of reconfigured compartments").
- `state.Compartment.B1:h1`: Map keyed by compartment identity (mirrors/cm6/state/src/facet.ts:455, :472)
- fixtures (53 compared of 53; equal 53): F0121 equal, F5001 equal, F5002 equal, F5003 equal, F5004 equal, F5005 equal, F5007 equal, F5008 equal, ... (45 more in the behavior's row)
- compared fixtures by text class: ascii 53
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.Compartment.B2` (Compartment, `state.cm6.057`)
- text: Input: two different instances of the same compartment reached in one configuration (including one appended later). Result: `RangeError("Duplicate use of compartment in extensions")`; the same instance object reached twice is deduplicated without error.
- `state.Compartment.B2:h1`: throw: RangeError("Duplicate use of compartment in extensions"); condition: a second distinct instance of a compartment; not checkable in advance by public API
- fixtures (55 compared of 55; equal 55): F0122 equal, F0123 equal, F0124 equal, F5001 equal, F5002 equal, F5003 equal, F5004 equal, F5005 equal, ... (47 more in the behavior's row)
- compared fixtures by text class: ascii 55
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.Compartment.reconfigure.B5` (Compartment.reconfigure, `state.cm6.059`)
- text: Input: a falsy content (`null`, `undefined`). Result: `stored || instance.inner` falls back to the instance's original content, so the compartment shows its initial content again and `c.get(state)` returns that original content.
- `state.Compartment.reconfigure.B5:h1`: truthiness fallback `||` on stored content
- decision rows of the item: state.cm6.059.d1
- fixtures (0 compared of 2; not run 2): F0134 not run, F0135 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Compartment.reconfigure.B6` (Compartment.reconfigure, `state.cm6.059`)
- text: Input: a compartment effect placed after `StateEffect.appendConfig` or `StateEffect.reconfigure` in the same transaction. Result: the effect writes into the start state's compartment map instead of a copy, so after the transaction `c.get(startState)` returns the new content and a later reconfiguring transaction from the start state uses it (Q14 in docs/parity/ferrum-state/questions.md, open). In the other order the start state is unaffected.
- `state.Compartment.reconfigure.B6:h1`: aliasing / mutation of a previous state's shared Map (Q14)
- decision rows of the item: state.cm6.059.d1
- fixtures (1 compared of 2; equal 1, not run 1): F0136 not run, F0137 equal
- compared fixtures by text class: ascii 1
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.Compartment.get.B1` (Compartment.get, `state.cm6.060`)
- text: Input: `c.get(state)`. Result: the content object currently used for the compartment (the same object passed to `of` or `reconfigure`), or undefined when the configuration does not reach the compartment.
- `state.Compartment.get.B1:h1`: Map lookup by identity; `undefined` for absent
- fixtures (2 compared of 2; equal 2): F0133 equal, F0139 equal
- compared fixtures by text class: ascii 2
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.Compartment.get.B3` (Compartment.get, `state.cm6.060`)
- text: Input: the start state of a transaction that had appendConfig/reconfigure before a compartment effect. Result: `c.get(startState)` changes after the transaction (Q14).
- `state.Compartment.get.B3:h1`: aliasing (Q14)
- fixtures (0 compared of 1; not run 1): F0136 not run
- ported cases: none
- written tests: written_state.rs::compartment_content_of_a_start_state_is_kept_after_a_compartment_effect_that_follows_append_config

## `state.combineConfig.B1` (combineConfig, `state.cm6.134`)
- text: Input: configs in order, each key's values. Result: per key, the first value that is not `undefined` is kept; a later value that is `===` to it, or `undefined`, is ignored.
- `state.combineConfig.B1:h1`: `===` equality (objects by identity)
- decision rows of the item: state.cm6.134.d1, state.cm6.134.d2
- fixtures (26 compared of 26; equal 26): F0140 equal, F0141 equal, F0142 equal, F5126 equal, F5132 equal, F5133 equal, F5134 equal, F5135 equal, ... (18 more in the behavior's row)
- compared fixtures by text class: empty 6, ascii 26
- ops they run: combineConfig.entries
- ported cases: none
- written tests: none

## `state.combineConfig.B3` (combineConfig, `state.cm6.134`)
- text: Input: a later differing value for a key without a combine function. Result: `Error("Config merge conflict for field " + key)` thrown at the first such key in config order (the error fires in the consumer facet's combine, i.e. while a configuration is resolved).
- `state.combineConfig.B3:h1`: throw: Error("Config merge conflict for field <key>"); not checkable in advance
- decision rows of the item: state.cm6.134.d1, state.cm6.134.d2
- fixtures (33 compared of 41; equal 33, not run 8): F0146 equal, F0147 equal, F0161 equal, F5123 equal, F5124 equal, F5125 not run, F5127 not run, F5128 not run, ... (33 more in the behavior's row)
- compared fixtures by text class: empty 19, ascii 33
- ops they run: combineConfig.entries
- ported cases: none
- written tests: none

## `state.combineConfig.B4` (combineConfig, `state.cm6.134`)
- text: Input: values equal in content but not under `===`: two NaN, two distinct objects, 0 and false, 1 and "1"; or `null` followed by a value. Result: a conflict (null is a value, not absence).
- `state.combineConfig.B4:h1`: NaN !== NaN
- `state.combineConfig.B4:h2`: null vs undefined distinction
- decision rows of the item: state.cm6.134.d1, state.cm6.134.d2
- fixtures (5 compared of 5; equal 5): F0142 equal, F0148 equal, F0149 equal, F0150 equal, F0151 equal
- compared fixtures by text class: ascii 5
- ops they run: combineConfig.entries
- ported cases: none
- written tests: none

## `state.combineConfig.B5` (combineConfig, `state.cm6.134`)
- text: Input: `defaults`. Result: after merging, every key enumerated by `for...in` over defaults (own and inherited enumerable keys) whose result is `undefined` gets the default value (including keys absent from every config and defaults that are themselves undefined); `null` results keep null.
- `state.combineConfig.B5:h1`: `for...in` includes inherited enumerable properties of `defaults`
- decision rows of the item: state.cm6.134.d1, state.cm6.134.d2
- fixtures (26 compared of 26; equal 26): F0140 equal, F0152 equal, F0153 equal, F5126 equal, F5132 equal, F5133 equal, F5134 equal, F5135 equal, ... (18 more in the behavior's row)
- compared fixtures by text class: empty 6, ascii 26
- ops they run: combineConfig.entries
- ported cases: none
- written tests: none

## `state.combineConfig.B6` (combineConfig, `state.cm6.134`)
- text: Input: keys in configs and defaults. Result: the result's key order is JS property order: integer-like keys first in ascending numeric order, then other keys in the order they were first set (config keys in config order, then default-only keys).
- `state.combineConfig.B6:h1`: integer-keyed property order
- decision rows of the item: state.cm6.134.d1, state.cm6.134.d2
- fixtures (1 compared of 1; equal 1): F0154 equal
- compared fixtures by text class: ascii 1
- ops they run: combineConfig.entries
- ported cases: none
- written tests: none

## `state.combineConfig.B8` (combineConfig, `state.cm6.134`)
- text: Input: a key named after an Object.prototype member (`toString`, `constructor`, `valueOf`, ...). Result: the inherited member counts as an existing value: a single value throws a merge conflict, a combine function is called with the inherited function as `current`, and a default for such a key is never applied (Q31). A combine object's inherited members do not count (own-property test).
- `state.combineConfig.B8:h1`: prototype-inherited keys on `{}` and `Object.hasOwnProperty.call` (Q31)
- decision rows of the item: state.cm6.134.d1, state.cm6.134.d2
- fixtures (1 compared of 5; equal 1, not run 4): F0156 equal, F0157 not run, F0187 not run, F0188 not run, F0189 not run
- compared fixtures by text class: ascii 1
- ops they run: combineConfig.entries
- ported cases: none
- written tests: none

## `state.Facet^define config FacetConfig.compare.B2` (Facet^define config FacetConfig.compare, `state.cm6.249`)
- text: Input: a recomputed output. Result: `compare(newOutput, oldOutput)` (new first); true keeps the old output object and the facet reports no change, so computed providers depending on the facet are not rerun; false stores the new output and dependents rerun.
- `state.Facet^define config FacetConfig.compare.B2:h1`: argument order compare(new, old)
- `state.Facet^define config FacetConfig.compare.B2:h2`: identity of kept output
- fixtures (3 compared of 3; equal 3): F0006 equal, F0165 equal, F0166 equal
- compared fixtures by text class: empty 2, ascii 3
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.Facet^define config FacetConfig.compare.B4` (Facet^define config FacetConfig.compare, `state.cm6.249`)
- text: Input: a custom compare on a facet without combine, as `EditorState.phrases` defines. Result: compare receives the output arrays, not individual inputs: with the phrases comparison (key counts and `a[k] == b[k]`) arrays with equal but distinct translation objects compare unequal (Q17 in docs/parity/ferrum-state/questions.md, open).
- `state.Facet^define config FacetConfig.compare.B4:h1`: compare applied to arrays (Q17)
- fixtures (1 compared of 1; equal 1): F0167 equal
- compared fixtures by text class: ascii 1
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.Facet^define config FacetConfig.compareInput.B1` (Facet^define config FacetConfig.compareInput, `state.cm6.250`)
- text: Input: no compareInput / a compareInput. Result: default `===`; called as compareInput(newInput, oldInput) for compute providers and per element for computeN providers, on update and on reconfiguration.
- `state.Facet^define config FacetConfig.compareInput.B1:h1`: argument order (new, old)
- fixtures (3 compared of 3; equal 3): F0050 equal, F0051 equal, F0062 equal
- compared fixtures by text class: ascii 3
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.Facet^define config FacetConfig.static.B2` (Facet^define config FacetConfig.static, `state.cm6.251`)
- text: Input: a static facet with `of` providers. Result: its output is always resolved at configuration time and only changes through reconfiguration; `EditorState.create` can read it before any dynamic slot exists (as it does for lineSeparator and allowMultipleSelections through `Configuration.staticFacet`).
- `state.Facet^define config FacetConfig.static.B2:h1`: `Configuration.staticFacet` reads `staticValues[addr >> 1]` without checking that the address is static (mirrors/cm6/state/src/facet.ts:466); only static facets are passed to it (mirrors/cm6/state/src/state.ts:246, :251)
- fixtures (1 compared of 1; equal 1): F0169 equal
- compared fixtures by text class: ascii 1
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.StateField^define config StateFieldSpec.create.B2` (StateField^define config StateFieldSpec.create, `state.cm6.253`)
- text: Input: create reading facets or fields of the state. Result: it sees the state under construction with the new configuration; slots it reads are computed first, on demand.
- `state.StateField^define config StateFieldSpec.create.B2:h1`: re-entrant access to the partly built state
- fixtures (2 compared of 2; equal 2): F0009 equal, F0176 equal
- compared fixtures by text class: ascii 2
- ops they run: scenario
- ported cases: test-facet#19 (test_cm6_facet_19_applies_effects_from_reconfiguring_transaction_to_new_fields)
- written tests: none

## `state.StateField^define config StateFieldSpec.update.B4` (StateField^define config StateFieldSpec.update, `state.cm6.254`)
- text: Input: update reading `tr.state` or `tr.startState`. Result: `tr.state` is the state being built (new configuration's facets, other fields computed on demand); `tr.startState` is the previous state.
- `state.StateField^define config StateFieldSpec.update.B4:h1`: re-entrancy (Q16)
- fixtures (2 compared of 2; equal 2): F0079 equal, F0180 equal
- compared fixtures by text class: ascii 2
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.StateField^define config StateFieldSpec.compare.B2` (StateField^define config StateFieldSpec.compare, `state.cm6.255`)
- text: Input: a compare. Result: called as compare(oldValue, newValue) after every update (not at create or reconfigure); true keeps the old object, so facets computed from the field are not rerun.
- `state.StateField^define config StateFieldSpec.compare.B2:h1`: argument order (old, new)
- fixtures (2 compared of 2; equal 2): F0069 equal, F0181 equal
- compared fixtures by text class: ascii 2
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.StateField^define config StateFieldSpec.toJSON.B2` (StateField^define config StateFieldSpec.toJSON, `state.cm6.257`)
- text: Input: a present field whose spec's `toJSON` is not a function (absent, or another value such as 5). Result: `TypeError` (V8: "value.spec.toJSON is not a function").
- `state.StateField^define config StateFieldSpec.toJSON.B2:h1`: engine TypeError instead of a designed error
- fixtures (1 compared of 2; not run 1, part 1): F0184 part, F7168 not run
- compared fixtures by text class: ascii 1
- ops they run: scenario
- ported cases: none
- written tests: none

## `state.Facet.computeN.B7` (Facet.computeN, `state.cm6.041`)
- text: Input: a getter whose result is not iterable (a number, null, undefined, a boolean, an array-like object such as {length: 2} without an iterator). Result: `computeN` and the provider accept it unchecked (the provider stores the value, facet.ts:160); the facet's dynamic slot then spreads it with `for...of` and throws `TypeError("value is not iterable")` (V8) at facet.ts:223 when the facet is computed: at `EditorState.create` (F7100-F7104) or when a later transaction recombines the facet. On a rerun (the getter returned an array first), null or undefined throw earlier, at `compareArray` reading `.length` (facet.ts:197, "Cannot read properties of null (reading 'length')"; F7105, F7106); a number, or an array-like of another or the same length whose elements compare unequal, counts as changed and then throws at facet.ts:223 (F7107, F7108). The exception propagates out of `EditorState.create` or `tr.state` (state.Facet.B10).
- `state.Facet.computeN.B7:h1`: duck typing: the result is used through the JS iteration protocol and `.length`; nothing checks it is an array
- `state.Facet.computeN.B7:h2`: engine TypeError text (V8) instead of a designed error
- `state.Facet.computeN.B7:h3`: the throw happens when the facet is computed, not when the getter returns
- fixtures (0 compared of 9; not run 9): F7100 not run, F7101 not run, F7102 not run, F7103 not run, F7104 not run, F7105 not run, F7106 not run, F7107 not run, ... (1 more in the behavior's row)
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Facet.computeN.B8` (Facet.computeN, `state.cm6.041`)
- text: Input: a getter returning an iterable without `.length`: a Set, a Map, a generator object. Result: at creation its elements are spread by `for...of` (a Map contributes its [key, value] entry arrays, F7111). On a rerun, `compareArray` reads `undefined` for both lengths, so `undefined != undefined` is false and the index loop does not run: the new value counts as unchanged whatever its elements or size, the old iterable object is kept and the facet is not recombined (Set [1, 2] then [7, 8]: output stays [1, 2] and the same object, F7109; Set [1] then [7, 8, 9]: stays [1], F7110). A generator object is a one-shot iterator stored as the provider's input: when the facet is recombined later because another provider changed, the same exhausted iterator contributes no element ([1, 2, 0] becomes [1], F7112).
- `state.Facet.computeN.B8:h1`: duck typing over the iteration protocol and `.length`
- `state.Facet.computeN.B8:h2`: comparison of `undefined` lengths counts as equal: changes are lost
- `state.Facet.computeN.B8:h3`: a stored iterator object is consumed by the first spread and reused (stale input)
- fixtures (0 compared of 4; not run 4): F7109 not run, F7110 not run, F7111 not run, F7112 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Facet.computeN.B9` (Facet.computeN, `state.cm6.041`)
- text: Input: `computeN(deps, get)` called twice, also with the same dependency list and the same getter function. Result: each call returns a new provider object (`a !== b`) whose `extension` is itself; both contribute when both are in a configuration ([1, 1]), while the same provider object listed twice contributes once (F7113).
- `state.Facet.computeN.B9:h1`: identity: providers are distinct objects deduplicated by identity in flatten (facet.ts:522-531)
- fixtures (1 compared of 1; equal 1): F7113 equal
- compared fixtures by text class: ascii 1
- ops they run: create, define, ext, extension, not, same, state.facet
- ported cases: none
- written tests: none

## `state.Facet.computeN.B10` (Facet.computeN, `state.cm6.041`)
- text: Input: a getter that is not a function (5, null). Result: `computeN` accepts it; the provider throws `TypeError("getter is not a function")` (V8) when it is first computed: at facet.ts:160 for a provider present when `EditorState.create` runs (F7114), at facet.ts:185 for a provider added by a reconfiguration (thrown by `tr.state`, F7115).
- `state.Facet.computeN.B10:h1`: engine TypeError text (V8)
- `state.Facet.computeN.B10:h2`: deferred failure: the call that receives the bad value succeeds
- fixtures (0 compared of 2; not run 2): F7114 not run, F7115 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Facet.compute.B12` (Facet.compute, `state.cm6.040`)
- text: Input: `compute(deps, get)` called twice, also with the same dependency list and the same getter function. Result: each call returns a new provider object (`a !== b`) whose `extension` is itself; both contribute when both are in a configuration ([1, 1]), while the same provider object listed twice contributes once (F7116).
- `state.Facet.compute.B12:h1`: identity: providers are distinct objects deduplicated by identity in flatten (facet.ts:522-531)
- fixtures (1 compared of 1; equal 1): F7116 equal
- compared fixtures by text class: ascii 1
- ops they run: create, define, ext, extension, not, same, state.facet
- ported cases: none
- written tests: none

## `state.Facet.compute.B13` (Facet.compute, `state.cm6.040`)
- text: Input: a getter that is not a function (5, undefined, "x"). Result: `compute` accepts it; the provider throws `TypeError("getter is not a function")` (V8) when it is first computed: at facet.ts:160 for a provider present when `EditorState.create` runs (F7117, F7118), at facet.ts:185 for a provider added by a reconfiguration (thrown by `tr.state`, F7119). Never at the `compute` call.
- `state.Facet.compute.B13:h1`: engine TypeError text (V8)
- `state.Facet.compute.B13:h2`: deferred failure: the call that receives the bad value succeeds
- fixtures (0 compared of 3; not run 3): F7117 not run, F7118 not run, F7119 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Facet.compute.B14` (Facet.compute, `state.cm6.040`)
- text: Input: a dependency list outside the `Slot` type (also for `computeN`, which shares the code). Result: `compute` stores it unchecked; it is read when the configuration is resolved (facet.ts:152-156). An entry that is not "doc", "selection" or an object with an `id` naming a slot of the configuration is ignored: other strings ("Doc"), numbers and `{}` add no dependency, so the getter never reruns on transactions (F7121); a string as the whole list is iterated per character ("doc" gives "d", "o", "c", none matching), so `compute("doc", get)` never reruns (F7120; control `["doc"]` reruns, F7122). A `null` or `undefined` entry throws `TypeError("Cannot read properties of null (reading 'id')")` at facet.ts:155 (F7123, F7124) and a non-iterable list (null) `TypeError("this.dependencies is not iterable")` at facet.ts:152 (F7125), from `EditorState.create`, or from `tr.state` for a provider added by a reconfiguration (F7126). In a reconfiguration, entries that are neither a Facet nor a StateField count as unchanged (facet.ts:177-179).
- `state.Facet.compute.B14:h1`: duck typing: dependencies are matched by `==` against two strings, then by `dep.id` lookup in the address table
- `state.Facet.compute.B14:h2`: silent: an unrecognized dependency never triggers a rerun
- `state.Facet.compute.B14:h3`: engine TypeError text (V8)
- fixtures (1 compared of 7; equal 1, not run 6): F7120 not run, F7121 not run, F7122 equal, F7123 not run, F7124 not run, F7125 not run, F7126 not run
- compared fixtures by text class: ascii 1
- ops they run: create, define, state.facet, state.update, tr.state
- ported cases: none
- written tests: none

## `state.Facet.from.B6` (Facet.from, `state.cm6.042`)
- text: Input: `from(field)` called twice with the same field. Result: each call returns a new provider object (`a !== b`, through a new `compute` provider with a new getter closure) whose `extension` is itself; both contribute when both are in a configuration ([1, 1]) (F7127).
- `state.Facet.from.B6:h1`: identity: providers are distinct objects deduplicated by identity in flatten (facet.ts:522-531)
- fixtures (1 compared of 1; equal 1): F7127 equal
- compared fixtures by text class: ascii 1
- ops they run: create, define, ext, extension, not, same, state.facet
- ported cases: none
- written tests: none

## `state.Facet.from.B7` (Facet.from, `state.cm6.042`)
- text: Input: a `get` argument that is not a function. Result: a falsy `get` (null, 0, "", false) is replaced by the identity, so the input is the field's value object itself, as without `get` (F7129); a truthy non-function (5) is accepted by `from` and throws `TypeError("get is not a function")` (V8) at facet.ts:110 when the provider is first computed (F7128).
- `state.Facet.from.B7:h1`: truthiness test on an optional callback: falsy values mean absent
- `state.Facet.from.B7:h2`: engine TypeError text (V8)
- fixtures (1 compared of 2; equal 1, not run 1): F7128 not run, F7129 equal
- compared fixtures by text class: empty 1, ascii 1
- ops they run: create, define, item, same, state.facet, state.field
- ported cases: none
- written tests: none

## `state.Facet.from.B8` (Facet.from, `state.cm6.042`)
- text: Input: a facet passed where a field is expected (`f.from(g)` with g a Facet). Result: the dependency is tracked as a facet dependency and the getter calls `state.field(g)`, which looks up the configuration address by `g.id` (state.ts:69-75) and so returns g's output when g is in the configuration: the input is that output object itself (`s.facet(f)[0] === s.facet(g)`, F7130); when g has no provider, `RangeError("Field is not present in this state")` is thrown while the state is built (F7131).
- `state.Facet.from.B8:h1`: duck typing: `EditorState.field` reads only `field.id` and the address table shared by fields and facets
- fixtures (0 compared of 2; not run 2): F7130 not run, F7131 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Facet^define.B6` (Facet^define, `state.cm6.038`)
- text: Input: `Facet.define(cfg)` called twice, also with the same config object. Result: two distinct facets (`a !== b`), each with its own id and its own default: a provider of one never feeds the other (s.facet(b) is [] while s.facet(a) is [1]), b's default is the same object in every state, and the two defaults are distinct objects (each is the array `combine([])` returned at its own definition) (F7132).
- `state.Facet^define.B6:h1`: identity: a facet is identified by its object and module-counter id
- `state.Facet^define.B6:h2`: the default object is shared by every state that lacks the facet
- fixtures (1 compared of 1; equal 1): F7132 equal
- compared fixtures by text class: ascii 1
- ops they run: create, define, not, same, state.facet
- ported cases: none
- written tests: none

## `state.Facet^define config FacetConfig.combine.B5` (Facet^define config FacetConfig.combine, `state.cm6.248`)
- text: Input: a `combine` that is not a function. Result: a truthy non-function (5, "x", {}) is kept by `config.combine || identity` and called once inside `Facet.define` for the default, so `define` throws `TypeError("combine is not a function")` (V8) at facet.ts:61 and no facet is created (F7133-F7135). A falsy value (null, 0, "", false) counts as absent, as `undefined` does (state.Facet^define.B4): identity combine, default [], and the output compare is `sameArray` (a reconfiguration with an equal input keeps the output object) (F7136).
- `state.Facet^define config FacetConfig.combine.B5:h1`: truthiness test on an optional callback
- `state.Facet^define config FacetConfig.combine.B5:h2`: engine TypeError text (V8)
- fixtures (1 compared of 4; equal 1, not run 3): F7133 not run, F7134 not run, F7135 not run, F7136 equal
- compared fixtures by text class: empty 1, ascii 1
- ops they run: count, create, define, item, same, state.facet, state.update, tr.state
- ported cases: none
- written tests: none

## `state.Facet^define config FacetConfig.compare.B6` (Facet^define config FacetConfig.compare, `state.cm6.249`)
- text: Input: a `compare` returning a value that is not a boolean. Result: the result is used by JS truthiness: any truthy value (1, "false", {}, true) counts as equal and keeps the old output object; any falsy value (0, "", null, undefined, false) counts as a change and stores the new output (a compare that forgets to return always reports a change) (F7137).
- `state.Facet^define config FacetConfig.compare.B6:h1`: truthiness of a callback result: a non-boolean is coerced, "false" is truthy
- fixtures (1 compared of 1; equal 1): F7137 equal
- compared fixtures by text class: empty 1, ascii 1
- ops they run: create, define, same, state.facet, state.update, tr.state
- ported cases: none
- written tests: none

## `state.Facet^define config FacetConfig.compare.B7` (Facet^define config FacetConfig.compare, `state.cm6.249`)
- text: Input: a `compare` that is not a function. Result: a falsy value (null, 0, "", false) counts as absent: the default compare applies (with a `combine`, `===`, so a combine building a new object reports a change on every recombination, F7141). A truthy non-function (5, "x", {}) is accepted by `define` and by `EditorState.create` (compare is never called at creation, state.Facet^define config FacetConfig.compare.B5) and throws `TypeError("facet.compare is not a function")` (V8) at the first comparison: a dynamic facet's update at facet.ts:238 (F7138), a static facet's resolution against an old state at facet.ts:498 (F7139), a dynamic facet's reconfiguration at facet.ts:250 (F7140); each is thrown by `tr.state`, the configuration being resolved when the new state is built.
- `state.Facet^define config FacetConfig.compare.B7:h1`: truthiness test on an optional callback
- `state.Facet^define config FacetConfig.compare.B7:h2`: engine TypeError text (V8)
- `state.Facet^define config FacetConfig.compare.B7:h3`: deferred failure: define and create succeed
- fixtures (1 compared of 4; equal 1, not run 3): F7138 not run, F7139 not run, F7140 not run, F7141 equal
- compared fixtures by text class: empty 1, ascii 1
- ops they run: create, define, same, state.facet, state.update, tr.state
- ported cases: none
- written tests: none

## `state.Facet^define config FacetConfig.compareInput.B4` (Facet^define config FacetConfig.compareInput, `state.cm6.250`)
- text: Input: a `compareInput` returning a value that is not a boolean. Result: used by JS truthiness: a truthy value (1, "false", {}, true) counts as equal, the old input is kept and the facet is not recombined (output [0], same object); a falsy value (0, "", null, undefined, false) counts as a change (output [1], new object) (F7142).
- `state.Facet^define config FacetConfig.compareInput.B4:h1`: truthiness of a callback result: a non-boolean is coerced
- fixtures (1 compared of 1; equal 1): F7142 equal
- compared fixtures by text class: empty 1, ascii 1
- ops they run: create, define, same, state.facet, state.update, tr.state
- ported cases: none
- written tests: none

## `state.Facet^define config FacetConfig.compareInput.B5` (Facet^define config FacetConfig.compareInput, `state.cm6.250`)
- text: Input: a `compareInput` that is not a function. Result: a falsy value counts as absent (`===`). A truthy non-function (5) is accepted by `define` and `EditorState.create` (never called at creation) and throws `TypeError("compare is not a function")` (V8) the first time a computed provider's rerun result is compared: a `compute` provider's update at facet.ts:166 (F7143); a `computeN` provider's update at facet.ts:198 only when the old and new arrays have the same non-zero length (F7144; arrays of different lengths are not compared element-wise and the new array is taken, F7145); a reconfiguration at facet.ts:180 only when some dependency changed (an unchanged dependency keeps the old input without comparing, F7146 second read).
- `state.Facet^define config FacetConfig.compareInput.B5:h1`: truthiness test on an optional callback
- `state.Facet^define config FacetConfig.compareInput.B5:h2`: engine TypeError text (V8)
- `state.Facet^define config FacetConfig.compareInput.B5:h3`: deferred and data-dependent failure
- fixtures (0 compared of 4; not run 4): F7143 not run, F7144 not run, F7145 not run, F7146 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Facet^define config FacetConfig.enables.B5` (Facet^define config FacetConfig.enables, `state.cm6.252`)
- text: Input: `enables` (or the result of an `enables` function) that is not an extension. Result: `define` stores it unchecked (`typeof enables == "function"` decides only whether to call it). A falsy value or result (0, "", false, null, undefined) enables nothing (`if (ext.facet.extensions)`, F7150). A truthy non-extension (5, {}, or a function returning 5) is harmless while the facet is only read (default []), and throws `Error("Unrecognized extension value in extension set (5).")` (`[object Object]` for {}) at facet.ts:550 when a configuration holding a provider of the facet is resolved (F7147-F7149).
- `state.Facet^define config FacetConfig.enables.B5:h1`: deferred failure: the error appears only where the facet has a provider
- `state.Facet^define config FacetConfig.enables.B5:h2`: truthiness test on the stored value
- fixtures (1 compared of 4; not run 3, part 1): F7147 not run, F7148 not run, F7149 not run, F7150 part
- compared fixtures by text class: empty 1, ascii 1
- ops they run: create, define, state.facet
- ported cases: none
- written tests: none

## `state.StateField^define config StateFieldSpec.create.B4` (StateField^define config StateFieldSpec.create, `state.cm6.253`)
- text: Input: a spec whose `create` is not a function (absent, 5). Result: `StateField.define` accepts it. When the field is created without an `init` entry, `(init?.create || this.createF)(state)` throws `TypeError("((intermediate value) || this.createF) is not a function")` (V8) at facet.ts:319: from `EditorState.create` (F7151) or from `tr.state` when a reconfiguration adds the field (F7152). With an `init` entry for the field the spec's `create` is never called and the field works (F7153).
- `state.StateField^define config StateFieldSpec.create.B4:h1`: engine TypeError text (V8)
- `state.StateField^define config StateFieldSpec.create.B4:h2`: deferred failure
- fixtures (0 compared of 3; not run 3): F7151 not run, F7152 not run, F7153 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.StateField^define config StateFieldSpec.update.B6` (StateField^define config StateFieldSpec.update, `state.cm6.254`)
- text: Input: a spec whose `update` is not a function (absent, 5). Result: `define`, `EditorState.create` and `state.update(...)` succeed (the value comes from create); reading `tr.state` throws `TypeError("this.updateF is not a function")` (V8) at facet.ts:332 (F7154, F7155).
- `state.StateField^define config StateFieldSpec.update.B6:h1`: engine TypeError text (V8)
- `state.StateField^define config StateFieldSpec.update.B6:h2`: deferred failure: thrown at the first state built by a transaction
- fixtures (0 compared of 2; not run 2): F7154 not run, F7155 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.StateField^define config StateFieldSpec.compare.B3` (StateField^define config StateFieldSpec.compare, `state.cm6.255`)
- text: Input: a field `compare` returning a value that is not a boolean. Result: used by JS truthiness: a truthy result (1, "false", {}, true) keeps the old value object and reports no change, so the update's new value is dropped; a falsy result (0, "", null, undefined, false) stores the new value (F7156).
- `state.StateField^define config StateFieldSpec.compare.B3:h1`: truthiness of a callback result: a non-boolean is coerced
- fixtures (1 compared of 1; equal 1): F7156 equal
- compared fixtures by text class: empty 1, ascii 1
- ops they run: create, define, item, same, state.field, state.update, tr.state
- ported cases: none
- written tests: none

## `state.StateField^define config StateFieldSpec.compare.B4` (StateField^define config StateFieldSpec.compare, `state.cm6.255`)
- text: Input: a field `compare` that is not a function. Result: a falsy value (null, 0, "", false) counts as absent: `===` (an update building a new object always counts as a change, F7158). A truthy non-function (5) is accepted by `define` and `create`, and throws `TypeError("this.compareF is not a function")` (V8) at facet.ts:333 when the first transaction's state is built (F7157).
- `state.StateField^define config StateFieldSpec.compare.B4:h1`: truthiness test on an optional callback
- `state.StateField^define config StateFieldSpec.compare.B4:h2`: engine TypeError text (V8)
- fixtures (1 compared of 2; equal 1, not run 1): F7157 not run, F7158 equal
- compared fixtures by text class: empty 1, ascii 1
- ops they run: create, define, same, state.field, state.update, tr.state
- ported cases: none
- written tests: none

## `state.StateField^define config StateFieldSpec.provide.B4` (StateField^define config StateFieldSpec.provide, `state.cm6.256`)
- text: Input: `provide` that is not a function, or a `provide` result that is not an extension. Result: a truthy non-function `provide` (5) makes `StateField.define` throw `TypeError("config.provide is not a function")` (V8) at facet.ts:313 (F7159). A result that is a truthy non-extension (5, "x", {}) is stored as `field.provides` and throws `Error("Unrecognized extension value in extension set (5).")` (`(x)`, `([object Object])`) at facet.ts:550 when a configuration holding the field is resolved (F7160-F7162). A falsy result (0, "", false, null, undefined) provides nothing (`if (ext.provides)`, F7163).
- `state.StateField^define config StateFieldSpec.provide.B4:h1`: deferred failure for a bad result
- `state.StateField^define config StateFieldSpec.provide.B4:h2`: truthiness test on the stored result
- `state.StateField^define config StateFieldSpec.provide.B4:h3`: engine TypeError text (V8)
- fixtures (0 compared of 5; not run 5): F7159 not run, F7160 not run, F7161 not run, F7162 not run, F7163 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.StateField.init.B6` (StateField.init, `state.cm6.048`)
- text: Input: `field.init(create)` with a `create` that is not a function. Result: `init` stores it unchecked. A falsy create (null, undefined, 0): at state creation `StateField.create` falls back to the spec's create (`init?.create || this.createF`, facet.ts:319), so the field gets the spec value (F7164); but when a reconfiguration brings in that init entry (the field already present, or added in the same transaction), the slot's reconfigure calls `reInit.create(state)` directly and throws `TypeError("reInit.create is not a function")` (V8) at facet.ts:340 (F7165, F7166). A truthy non-function (5) throws `TypeError("((intermediate value) || this.createF) is not a function")` at facet.ts:319 at creation (F7167), and at facet.ts:340 through a reconfiguration.
- `state.StateField.init.B6:h1`: two call sites treat a falsy init create differently: `||` fallback at creation, direct call at reconfiguration
- `state.StateField.init.B6:h2`: engine TypeError text (V8)
- decision rows of the item: state.cm6.048.d1
- fixtures (0 compared of 4; not run 4): F7164 not run, F7165 not run, F7166 not run, F7167 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.StateField^define.B3` (StateField^define, `state.cm6.047`)
- text: Input: `StateField.define(spec)` called twice with the same spec object. Result: two distinct fields (`a !== b`) with separate slots and values (two objects from the same create), `provide` called once per `define` (2 calls), and one field present does not make the other present (`state.field(b, false)` undefined) (F7170).
- `state.StateField^define.B3:h1`: identity: a field is identified by its object and module-counter id
- decision rows of the item: state.cm6.047.d1
- fixtures (1 compared of 1; equal 1): F7170 equal
- compared fixtures by text class: ascii 1
- ops they run: counter, create, define, not, same, state.field
- ported cases: none
- written tests: none

## `state.Extension.B9` (Extension, `state.cm6.050`)
- text: Input: a falsy value or null/undefined given as a whole configuration or as the content of a wrapper. Result: only `EditorState.create` replaces a falsy `extensions` (null, undefined, 0, false, "") by [] (state.ts:244; F7171). Everywhere else the value is flattened like any extension: `StateEffect.reconfigure.of(null|undefined)` and `StateEffect.appendConfig.of(null|undefined)` (concat appends the value) throw `TypeError("Cannot read properties of null (reading 'extension')")` (or `of undefined`) at facet.ts:549 when `tr.state` resolves the configuration (F7172-F7175), `reconfigure.of(0)` throws `Error("Unrecognized extension value in extension set (0).")` at facet.ts:550 (F7176); `new Compartment().of(null)` and `Prec.high(undefined)` throw the TypeError from `EditorState.create` (F7177, F7178), and `false` inside an array throws `Error("Unrecognized extension value in extension set (false).")` (F7179). (`Compartment.reconfigure(null)` instead falls back to the instance's content, state.Compartment.reconfigure.B5.)
- `state.Extension.B9:h1`: asymmetry: falsy is 'no extensions' only at EditorState.create
- `state.Extension.B9:h2`: engine TypeError text (V8) for null/undefined
- fixtures (1 compared of 9; equal 1, not run 8): F7171 equal, F7172 not run, F7173 not run, F7174 not run, F7175 not run, F7176 not run, F7177 not run, F7178 not run, ... (1 more in the behavior's row)
- compared fixtures by text class: empty 1, ascii 1
- ops they run: create, state.tabSize
- ported cases: none
- written tests: none

## `state.combineConfig.B11` (combineConfig, `state.cm6.134`)
- text: Input: any call. Result: a new plain object every time: never one of the configs (`combineConfig([cfg], {}) !== cfg`) nor the defaults object (`combineConfig([], d) !== d`); two calls with the same arguments give two objects; mutating the result leaves the configs and defaults unchanged. The values are not copied: an object value in the result is the very object from the config (F7180). A facet whose `combine` returns `combineConfig(...)` without its own `compare` therefore gets a new output object on every recombination (default compare `===`, facet.ts:73), e.g. mirrors/cm6/view/src/draw-selection.ts:20-26 checked with `!=` at :69.
- `state.combineConfig.B11:h1`: identity: a new result object per call; values shared by reference
- decision rows of the item: state.cm6.134.d1, state.cm6.134.d2
- fixtures (1 compared of 1; equal 1): F7180 equal
- compared fixtures by text class: ascii 1
- ops they run: all, combineConfig.call, data, item, list, not, same, set
- ported cases: none
- written tests: none

## `state.combineConfig.B12` (combineConfig, `state.cm6.134`)
- text: Input: arguments of the wrong shape. Result: `configs` not iterable (5, null) throws `TypeError("configs is not iterable")` and a null or undefined config throws `TypeError("Cannot convert undefined or null to object")` (`Object.keys`), both at config.ts:14 (F7181-F7184). Primitive configs contribute their own enumerable keys: a string its UTF-16 code units under index keys ("ab" gives {0: "a", 1: "b"}; "a\u{1F600}" gives three keys, the surrogates as lone code units, F7186), an array its elements, a number or boolean nothing (F7185). `defaults` null or undefined adds nothing (`for...in` over null does not throw); a string defaults adds its characters under index keys; a number nothing (F7187). `combine` null throws `TypeError("Cannot convert undefined or null to object")` at config.ts:18 only when a key conflicts (F7189; no conflict, no error, F7188); a non-function own entry throws `TypeError("combine[key] is not a function")` at config.ts:18 only on a conflict for that key (F7191; no conflict, F7190).
- `state.combineConfig.B12:h1`: engine TypeError text (V8)
- `state.combineConfig.B12:h2`: UTF-16 index keys from Object.keys of a string
- `state.combineConfig.B12:h3`: data-dependent failure: combine is consulted only on a conflict
- decision rows of the item: state.cm6.134.d1, state.cm6.134.d2
- fixtures (1 compared of 11; not run 10, part 1): F7181 not run, F7182 not run, F7183 not run, F7184 not run, F7185 not run, F7186 not run, F7187 part, F7188 not run, ... (3 more in the behavior's row)
- compared fixtures by text class: ascii 1
- ops they run: combineConfig.call, data
- ported cases: none
- written tests: none

## `state.Prec.highest.B3` (Prec.highest, `state.cm6.052`)
- text: Input: `Prec.highest(x)` called twice with the same x. Result: two distinct wrapper objects (`a !== b`), neither of them x, each with `extension` returning itself; x inside them is one extension value, deduplicated by identity, so `[a, b, x]` contributes x's input once ([1]) (F7192).
- `state.Prec.highest.B3:h1`: identity: a new wrapper per call; the wrapped value is deduplicated by its own identity (facet.ts:522-531)
- fixtures (1 compared of 1; equal 1): F7192 equal
- compared fixtures by text class: ascii 1
- ops they run: create, define, ext, extension, not, same, state.facet
- ported cases: none
- written tests: none

## `state.Prec.high.B2` (Prec.high, `state.cm6.053`)
- text: Input: `Prec.high(x)` called twice with the same x. Result: two distinct wrapper objects (`a !== b`), neither of them x, each with `extension` returning itself; x inside them is one extension value, deduplicated by identity, so `[a, b, x]` contributes x's input once ([1]) (F7193).
- `state.Prec.high.B2:h1`: identity: a new wrapper per call; the wrapped value is deduplicated by its own identity (facet.ts:522-531)
- fixtures (1 compared of 1; equal 1): F7193 equal
- compared fixtures by text class: ascii 1
- ops they run: create, define, ext, extension, not, same, state.facet
- ported cases: none
- written tests: none

## `state.Prec.default.B3` (Prec.default, `state.cm6.054`)
- text: Input: `Prec.default(x)` called twice with the same x. Result: two distinct wrapper objects (`a !== b`), neither of them x, each with `extension` returning itself; x inside them is one extension value, deduplicated by identity, so `[a, b, x]` contributes x's input once ([1]) (F7194).
- `state.Prec.default.B3:h1`: identity: a new wrapper per call; the wrapped value is deduplicated by its own identity (facet.ts:522-531)
- fixtures (1 compared of 1; equal 1): F7194 equal
- compared fixtures by text class: ascii 1
- ops they run: create, define, ext, extension, not, same, state.facet
- ported cases: none
- written tests: none

## `state.Prec.low.B2` (Prec.low, `state.cm6.055`)
- text: Input: `Prec.low(x)` called twice with the same x. Result: two distinct wrapper objects (`a !== b`), neither of them x, each with `extension` returning itself; x inside them is one extension value, deduplicated by identity, so `[a, b, x]` contributes x's input once ([1]) (F7195).
- `state.Prec.low.B2:h1`: identity: a new wrapper per call; the wrapped value is deduplicated by its own identity (facet.ts:522-531)
- fixtures (1 compared of 1; equal 1): F7195 equal
- compared fixtures by text class: ascii 1
- ops they run: create, define, ext, extension, not, same, state.facet
- ported cases: none
- written tests: none

## `state.Prec.lowest.B3` (Prec.lowest, `state.cm6.056`)
- text: Input: `Prec.lowest(x)` called twice with the same x. Result: two distinct wrapper objects (`a !== b`), neither of them x, each with `extension` returning itself; x inside them is one extension value, deduplicated by identity, so `[a, b, x]` contributes x's input once ([1]) (F7196).
- `state.Prec.lowest.B3:h1`: identity: a new wrapper per call; the wrapped value is deduplicated by its own identity (facet.ts:522-531)
- fixtures (1 compared of 1; equal 1): F7196 equal
- compared fixtures by text class: ascii 1
- ops they run: create, define, ext, extension, not, same, state.facet
- ported cases: none
- written tests: none

## `state.Compartment.B6` (Compartment, `state.cm6.057`)
- text: Input: two compartments made with `new Compartment()`. Result: distinct objects (`c1 !== c2`) and distinct keys of the configuration's compartment map: instances of both in one configuration do not conflict even with the same content object (`[c1.of(x), c2.of(x)]` gives [1] contributed once, x being one deduplicated array), each `get` returns its own content (the same x), and reconfiguring c1 leaves c2's content as it was (facet [3, 1], `c2.get(s2) === x`) (F7197).
- `state.Compartment.B6:h1`: Map keyed by compartment identity (facet.ts:455, :472)
- fixtures (1 compared of 1; part 1): F7197 part
- compared fixtures by text class: ascii 1
- ops they run: compartment.get, create, define, not, same, state.facet, state.update, tr.state
- ported cases: none
- written tests: none
