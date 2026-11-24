# Hazards of chunk `facet`, ferrum-state (tools/conf_check.py hazards)

Each hazard of a behavior of the chunk's items, and every check that names the behavior: fixtures with their result
at the hand-off (`equal`, `part`, `none`), ported cm6 cases, written tests with `// covers:`. Whether a check
exercises the hazard is the verifier's reading.

## `state.Facet.B1` (Facet)
- hazard: module-level counter `nextID` shared by Facet, FacetProvider and StateField (mirrors/cm6/state/src/facet.ts:4, :45, :140, :312): global mutable state; ids are the keys of `Configuration.address` and `facets` (mirrors/cm6/state/src/facet.ts:457-459)
- fixtures (1 compared of 1; equal 1): F0001 equal
- ported cases: none
- written tests: none

## `state.Facet.B2` (Facet)
- hazard: shared mutable default object: the same `default` object is returned for every state that lacks the facet (mirrors/cm6/state/src/facet.ts:61, mirrors/cm6/state/src/state.ts:196); callers compare it with `===` (e.g. F0002 `same: true` across states)
- fixtures (2 compared of 2; equal 2): F0002 equal, F0003 equal
- ported cases: test-facet#04 (test_cm6_facet_04_returns_an_empty_array_for_absent_facet); test-facet#09 (test_cm6_facet_09_can_handle_dependencies_on_facets_that_aren_t_present_in_the_state); test-facet#15 (test_cm6_facet_15_survives_reconfiguration)
- written tests: none

## `state.Facet.B4` (Facet)
- hazard: identity: the kept old output is the same object (`===`) as before (mirrors/cm6/state/src/facet.ts:238)
- fixtures (65 compared of 65; equal 65): F0005 equal, F0006 equal, F5062 equal, F5063 equal, F5064 equal, F5065 equal, F5066 equal, F5067 equal, ... (57 more in the behavior's row)
- ported cases: test-facet#07 (test_cm6_facet_07_supports_dynamic_facet); test-facet#14 (test_cm6_facet_14_works_with_a_dynamic_combined_facet)
- written tests: none

## `state.Facet.B6` (Facet)
- hazard: integer-keyed object iteration order: `for (let id in facets)` visits facet ids in ascending numeric order (mirrors/cm6/state/src/facet.ts:489)
- hazard: module-level counter `nextID` shared by Facet, FacetProvider and StateField (mirrors/cm6/state/src/facet.ts:4, :45, :140, :312): global mutable state; ids are the keys of `Configuration.address` and `facets` (mirrors/cm6/state/src/facet.ts:457-459)
- hazard: re-entrant computation: a slot function reading another slot computes it on demand (mirrors/cm6/state/src/facet.ts:566-575)
- fixtures (3 compared of 3; equal 3): F0007 equal, F0008 equal, F0009 equal
- ported cases: none
- written tests: none

## `state.Facet.B7` (Facet)
- hazard: provider identity: `sameArray(oldProviders, providers)` compares provider objects with `===` (mirrors/cm6/state/src/facet.ts:494, :131-133)
- hazard: identity of outputs observable with `===` (mirrors/cm6/state/src/facet.ts:495, :498)
- fixtures (6 compared of 6; equal 6): F0010 equal, F0011 equal, F0012 equal, F7000 equal, F7001 equal, F7003 equal
- ported cases: test-facet#17 (test_cm6_facet_17_preserves_static_facets_across_reconfiguration)
- written tests: none

## `state.Facet.B8` (Facet)
- hazard: provider identity (`sameArray` on provider objects, mirrors/cm6/state/src/facet.ts:245)
- fixtures (4 compared of 4; equal 4): F0013 equal, F0014 equal, F0015 equal, F7006 equal
- ported cases: test-facet#15 (test_cm6_facet_15_survives_reconfiguration); test-facet#16 (test_cm6_facet_16_survives_unrelated_reconfiguration_even_without_deep_compare); test-facet#21 (test_cm6_facet_21_updates_facets_computed_from_static_values_on_reconfigure); test-facet#22 (test_cm6_facet_22_preserves_dynamic_facet_values_when_dependencies_stay_the_same)
- written tests: none

## `state.Facet.B9` (Facet)
- hazard: throw: Error("Cyclic dependency between fields and/or facets") (mirrors/cm6/state/src/facet.ts:570); condition: a slot is read while it is being computed; protects against infinite recursion; a caller cannot check it in advance
- hazard: re-entrancy: slots are computed on demand from inside other slots' functions (mirrors/cm6/state/src/facet.ts:566-575)
- fixtures (4 compared of 4; equal 4): F0016 equal, F0017 equal, F0018 equal, F0190 equal
- ported cases: test-facet#20 (test_cm6_facet_20_errors_on_cyclic_dependencies)
- written tests: none

## `state.Facet.B10` (Facet)
- hazard: exception safety: slot status stays Computing after a throw (mirrors/cm6/state/src/facet.ts:572-574) and `tr._state` is set before computation (mirrors/cm6/state/src/state.ts:58)
- fixtures (2 compared of 3; equal 2, not run 1): F0019 not run, F0020 equal, F0021 equal
- ported cases: none
- written tests: written_state.rs::a_second_state_of_a_transaction_whose_first_build_panicked_is_built_again

## `state.Facet.reader.B2` (Facet.reader)
- hazard: `instanceof Facet` dispatch on dependencies (mirrors/cm6/state/src/facet.ts:178)
- fixtures (1 compared of 1; equal 1): F0024 equal
- ported cases: none
- written tests: none

## `state.FacetReader.B3` (FacetReader)
- hazard: duck typing: `EditorState.facet` takes any object with `id` and `default`
- hazard: `instanceof` dispatch on compute dependencies
- fixtures (0 compared of 1; not run 1): F0025 not run
- ported cases: none
- written tests: none
- hand-off: accepted: a row of class form, state.cm6.044.d1

## `state.Facet^define.B3` (Facet^define)
- hazard: throw propagated from user combine at definition time
- fixtures (2 compared of 2; equal 2): F0027 equal, F0028 equal
- ported cases: none
- written tests: none

## `state.Facet^define.B4` (Facet^define)
- hazard: optional field tested by truthiness: any falsy `combine` counts as absent
- fixtures (1 compared of 1; equal 1): F0029 equal
- ported cases: none
- written tests: none

## `state.Facet^define.B5` (Facet^define)
- hazard: `!!` coercion of an optional flag
- fixtures (2 compared of 2; equal 2): F0030 equal, F0031 equal
- ported cases: none
- written tests: none

## `state.Facet.of.B1` (Facet.of)
- hazard: module-level counter `nextID` shared by Facet, FacetProvider and StateField (mirrors/cm6/state/src/facet.ts:4, :45, :140, :312): global mutable state; ids are the keys of `Configuration.address` and `facets` (mirrors/cm6/state/src/facet.ts:457-459)
- fixtures (2 compared of 2; equal 2): F0033 equal, F0037 equal
- ported cases: test-facet#01 (test_cm6_facet_01_allows_querying_of_facets); test-facet#02 (test_cm6_facet_02_includes_sub_extenders)
- written tests: none

## `state.Facet.of.B2` (Facet.of)
- hazard: deduplication by object identity through a `Map<Extension, number>` (mirrors/cm6/state/src/facet.ts:522)
- fixtures (1 compared of 1; equal 1): F0034 equal
- ported cases: test-facet#03 (test_cm6_facet_03_only_includes_duplicated_extensions_once)
- written tests: none

## `state.Facet.of.B3` (Facet.of)
- hazard: aliasing: provided objects are shared, not copied
- fixtures (2 compared of 2; equal 2): F0035 equal, F0036 equal
- ported cases: none
- written tests: none

## `state.Facet.compute.B1` (Facet.compute)
- hazard: throw: Error("Can't compute a static facet"); condition: facet defined with a truthy `static`; checkable in advance only by knowing the facet's definition (no public accessor for the flag)
- fixtures (2 compared of 2; equal 2): F0040 equal, F0041 equal
- ported cases: none
- written tests: none

## `state.Facet.compute.B2` (Facet.compute)
- hazard: the getter receives the partly built state (Q16)
- fixtures (1 compared of 1; equal 1): F0042 equal
- ported cases: test-facet#07 (test_cm6_facet_07_supports_dynamic_facet); test-facet#09 (test_cm6_facet_09_can_handle_dependencies_on_facets_that_aren_t_present_in_the_state)
- written tests: none

## `state.Facet.compute.B5` (Facet.compute)
- hazard: `?? 1` default makes a dependency missing from the address map look static (mirrors/cm6/state/src/facet.ts:155)
- fixtures (65 compared of 65; equal 65): F0047 equal, F0048 equal, F0049 equal, F0190 equal, F5062 equal, F5063 equal, F5064 equal, F5065 equal, ... (57 more in the behavior's row)
- ported cases: test-facet#08 (test_cm6_facet_08_only_recomputes_a_facet_value_when_necessary); test-facet#09 (test_cm6_facet_09_can_handle_dependencies_on_facets_that_aren_t_present_in_the_state)
- written tests: none

## `state.Facet.compute.B6` (Facet.compute)
- hazard: argument order: compareInput(newValue, oldValue)
- fixtures (63 compared of 63; equal 63): F0050 equal, F0051 equal, F5062 equal, F5063 equal, F5064 equal, F5065 equal, F5066 equal, F5067 equal, ... (55 more in the behavior's row)
- ported cases: test-facet#10 (test_cm6_facet_10_can_specify_a_dependency_on_the_document); test-facet#11 (test_cm6_facet_11_can_specify_a_dependency_on_the_selection)
- written tests: none

## `state.Facet.compute.B8` (Facet.compute)
- hazard: identity and loose equality: facets compared with `===`, fields with `==` (mirrors/cm6/state/src/facet.ts:178-179)
- hazard: argument order: compare(newValue, oldValue)
- fixtures (66 compared of 66; equal 66): F0053 equal, F0054 equal, F0055 equal, F0056 equal, F5062 equal, F5063 equal, F5064 equal, F5065 equal, ... (58 more in the behavior's row)
- ported cases: test-facet#16 (test_cm6_facet_16_survives_unrelated_reconfiguration_even_without_deep_compare); test-facet#21 (test_cm6_facet_21_updates_facets_computed_from_static_values_on_reconfigure); test-facet#22 (test_cm6_facet_22_preserves_dynamic_facet_values_when_dependencies_stay_the_same)
- written tests: written_state.rs::a_provider_runs_again_when_a_facet_without_combine_recombines_an_equal_list_its_compare_calls_unequal

## `state.Facet.compute.B9` (Facet.compute)
- hazard: provider identity: `oldState.config.address[id]` keyed by the provider's id
- fixtures (1 compared of 1; equal 1): F0057 equal
- ported cases: test-facet#15 (test_cm6_facet_15_survives_reconfiguration)
- written tests: none

## `state.Facet.compute.B11` (Facet.compute)
- hazard: correctness depends on the caller declaring every dependency (doc comment at :84-86)
- fixtures (1 compared of 1; equal 1): F0059 equal
- ported cases: none
- written tests: none

## `state.Facet.computeN.B1` (Facet.computeN)
- hazard: throw: Error("Can't compute a static facet")
- fixtures (1 compared of 1; equal 1): F0060 equal
- ported cases: none
- written tests: none

## `state.Facet.computeN.B3` (Facet.computeN)
- hazard: argument order: compareInput(new[i], old[i])
- fixtures (23 compared of 23; equal 23): F0062 equal, F0063 equal, F5065 equal, F5066 equal, F5068 equal, F5072 equal, F5076 equal, F5085 equal, ... (15 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.Facet.computeN.B5` (Facet.computeN)
- hazard: duck typing: any iterable is spread; a string spreads by code point (for...of) while `.length` counts UTF-16 units
- fixtures (0 compared of 6; not run 6): F0065 not run, F0192 not run, F6030 not run, F6031 not run, F6032 not run, F6033 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Facet.from.B4` (Facet.from)
- hazard: throw: RangeError("Field is not present in this state")
- fixtures (1 compared of 1; equal 1): F0070 equal
- ported cases: none
- written tests: none

## `state.StateField.B1` (StateField)
- hazard: module-level counter `nextID` shared by Facet, FacetProvider and StateField (mirrors/cm6/state/src/facet.ts:4, :45, :140, :312): global mutable state; ids are the keys of `Configuration.address` and `facets` (mirrors/cm6/state/src/facet.ts:457-459)
- hazard: identity: deduplication by object
- fixtures (2 compared of 2; equal 2): F0072 equal, F0073 equal
- ported cases: none
- written tests: none

## `state.StateField.B2` (StateField)
- hazard: lookup by identity: `i.field == this` (mirrors/cm6/state/src/facet.ts:318)
- fixtures (1 compared of 1; equal 1): F0074 equal
- ported cases: none
- written tests: none

## `state.StateField.B3` (StateField)
- hazard: argument order: compare(old, new), the reverse of the facet comparisons
- hazard: identity: kept old value is the same object
- fixtures (1 compared of 1; equal 1): F0075 equal
- ported cases: none
- written tests: none

## `state.StateField.B4` (StateField)
- hazard: identity of init entries: `reInit != oldInit.find(...)` (mirrors/cm6/state/src/facet.ts:339)
- fixtures (1 compared of 1; equal 1): F0076 equal
- ported cases: test-facet#18 (test_cm6_facet_18_creates_newly_added_fields_when_reconfiguring); test-facet#19 (test_cm6_facet_19_applies_effects_from_reconfiguring_transaction_to_new_fields)
- written tests: none

## `state.StateField.B5` (StateField)
- hazard: throw: RangeError("Field is not present in this state") at mirrors/cm6/state/src/state.ts:71 (EditorState.field) when the field has no address in the configuration (`this.config.address[field.id] == null`, state.ts:69-70) and `require` is truthy. `require` defaults to true only when the argument is undefined or omitted (state.ts:68), so `field(f, false)`, `field(f, null)`, `field(f, 0)` and `field(f, "")` return undefined without throwing, while `field(f, 1)` and `field(f, "x")` throw (fixtures F5184-F5192, written by oracle/cm6/facet/gapfill-field-require.ts; the same rule is state.EditorState.field.B2 and B3).
- hazard: `field(f, false)` returns undefined both for a missing field (F0078) and for a present field whose value is undefined (F5193, F5194: a field created with `create: () => undefined`), so it does not tell a caller whether the field is present. In state.ts the public members that consult presence without throwing are `toJSON(fields)`, which includes a property only for a present field (state.ts:212) and then calls that field's `spec.toJSON`; and catching the RangeError of `field(f)` (read from state.ts).
- fixtures (13 compared of 13; equal 13): F0077 equal, F0078 equal, F5184 equal, F5185 equal, F5186 equal, F5187 equal, F5188 equal, F5189 equal, ... (5 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.StateField.B6` (StateField)
- hazard: module-level counter `nextID` shared by Facet, FacetProvider and StateField (mirrors/cm6/state/src/facet.ts:4, :45, :140, :312): global mutable state; ids are the keys of `Configuration.address` and `facets` (mirrors/cm6/state/src/facet.ts:457-459)
- fixtures (1 compared of 1; equal 1): F0073 equal
- ported cases: none
- written tests: none

## `state.StateField.B7` (StateField)
- hazard: order of user callbacks is observable through side effects
- fixtures (2 compared of 2; equal 2): F0007 equal, F0008 equal
- ported cases: none
- written tests: none

## `state.StateField.B8` (StateField)
- hazard: re-entrant access to the partly built state (Q16)
- fixtures (1 compared of 1; equal 1): F0079 equal
- ported cases: none
- written tests: none

## `state.StateField.init.B3` (StateField.init)
- hazard: identity of the entry object decides re-initialization
- fixtures (2 compared of 2; equal 2): F0086 equal, F0087 equal
- ported cases: none
- written tests: none

## `state.StateField.extension.B1` (StateField.extension)
- hazard: identity: the result is `===` the field, and `flatten` deduplicates by that object (`seen` Map<Extension, number>, mirrors/cm6/state/src/facet.ts:522-531)
- hazard: prototype accessor, not an own property: JS reflection (`Object.keys`, `JSON.stringify`, spread) does not show it, `in` does
- fixtures (2 compared of 2; part 2): F0106 part, F6001 part
- ported cases: none
- written tests: none

## `state.StateField.extension.B2` (StateField.extension)
- hazard: identity: the second occurrence is skipped because it is the same object at the same precedence (`known <= prec`, mirrors/cm6/state/src/facet.ts:526)
- fixtures (4 compared of 4; equal 4): F6002 equal, F6003 equal, F6004 equal, F6005 equal
- ported cases: none
- written tests: none

## `state.StateField.extension.B3` (StateField.extension)
- hazard: identity: the move to a higher level finds the earlier placement with `indexOf` and removes it with `splice` (mirrors/cm6/state/src/facet.ts:527-528)
- hazard: order of user callbacks (create, update, provide) is observable
- fixtures (7 compared of 7; equal 7): F6006 equal, F6007 equal, F6008 equal, F6009 equal, F6010 equal, F6011 equal, F6012 equal
- ported cases: none
- written tests: none

## `state.StateField.extension.B4` (StateField.extension)
- hazard: identity: the value included is the field object itself; any code keyed on the field (`state.field(field)`, `Configuration.address[field.id]`) finds it
- fixtures (5 compared of 5; equal 5): F6013 equal, F6014 equal, F6015 equal, F6016 equal, F6017 equal
- ported cases: none
- written tests: none

## `state.StateField.extension.B5` (StateField.extension)
- hazard: duck typing: truthiness of an untyped property read decides whether a value is an extension (mirrors/cm6/lsp-client/src/client.ts:264)
- hazard: union-typed parameter: `readonly (Extension | LSPClientExtension)[]` (mirrors/cm6/lsp-client/src/client.ts:205)
- fixtures (1 compared of 1; equal 1): F6018 equal
- ported cases: none
- written tests: none

## `state.StateField.extension.B6` (StateField.extension)
- hazard: prototype dispatch: `instanceof` tests in a fixed order (Array.isArray, CompartmentInstance, PrecExtension, StateField, FacetProvider) precede duck typing (mirrors/cm6/state/src/facet.ts:532-549)
- fixtures (0 compared of 1; not run 1): F6019 not run
- ported cases: none
- written tests: none
- hand-off: accepted: a row of class form, state.cm6.049.d1

## `state.StateField.extension.B7` (StateField.extension)
- hazard: identity: `content == ext` decides the second message (mirrors/cm6/state/src/facet.ts:551)
- hazard: `instanceof` fails across package copies
- hazard: throw: Error at mirrors/cm6/state/src/facet.ts:551; condition: a value whose `extension` is itself and that matches no `instanceof` test of this copy; protects against infinite recursion; a caller can check `x instanceof StateField` in advance
- fixtures (0 compared of 5; not run 5): F6020 not run, F6021 not run, F6022 not run, F6023 not run, F6024 not run
- ported cases: none
- written tests: none
- hand-off: accepted: a row of class form, state.cm6.049.d1

## `state.Extension.B2` (Extension)
- hazard: duck typing on `.extension`
- fixtures (1 compared of 1; equal 1): F0091 equal
- ported cases: none
- written tests: none

## `state.Extension.B3` (Extension)
- hazard: throw: Error("Unrecognized extension value in extension set (...)."); message embeds JS `${value}` conversion (function source text)
- fixtures (0 compared of 5; not run 5): F0092 not run, F0093 not run, F0094 not run, F0095 not run, F0096 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Extension.B4` (Extension)
- hazard: `instanceof` dispatch fails across package copies
- fixtures (0 compared of 1; not run 1): F0097 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Extension.B5` (Extension)
- hazard: engine-specific TypeError message
- fixtures (1 compared of 3; equal 1, not run 2): F0098 not run, F0099 not run, F0100 equal
- ported cases: none
- written tests: none

## `state.Extension.B6` (Extension)
- hazard: `Map<Extension, number>` keyed by object identity (mirrors/cm6/state/src/facet.ts:522); `indexOf` + `splice` to move (mirrors/cm6/state/src/facet.ts:527-528)
- fixtures (67 compared of 67; equal 67): F0034 equal, F0101 equal, F0102 equal, F0103 equal, F0104 equal, F0105 equal, F5001 equal, F5002 equal, ... (59 more in the behavior's row)
- ported cases: test-facet#03 (test_cm6_facet_03_only_includes_duplicated_extensions_once)
- written tests: none

## `state.Prec.B7` (Prec)
- hazard: callback order observable
- fixtures (2 compared of 2; equal 2): F0008 equal, F0117 equal
- ported cases: none
- written tests: none

## `state.Compartment.B1` (Compartment)
- hazard: Map keyed by compartment identity (mirrors/cm6/state/src/facet.ts:455, :472)
- fixtures (53 compared of 53; equal 53): F0121 equal, F5001 equal, F5002 equal, F5003 equal, F5004 equal, F5005 equal, F5007 equal, F5008 equal, ... (45 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.Compartment.B2` (Compartment)
- hazard: throw: RangeError("Duplicate use of compartment in extensions"); condition: a second distinct instance of a compartment; not checkable in advance by public API
- fixtures (55 compared of 55; equal 55): F0122 equal, F0123 equal, F0124 equal, F5001 equal, F5002 equal, F5003 equal, F5004 equal, F5005 equal, ... (47 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.Compartment.reconfigure.B5` (Compartment.reconfigure)
- hazard: truthiness fallback `||` on stored content
- fixtures (0 compared of 2; not run 2): F0134 not run, F0135 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Compartment.reconfigure.B6` (Compartment.reconfigure)
- hazard: aliasing / mutation of a previous state's shared Map (Q14)
- fixtures (1 compared of 2; equal 1, not run 1): F0136 not run, F0137 equal
- ported cases: none
- written tests: none

## `state.Compartment.get.B1` (Compartment.get)
- hazard: Map lookup by identity; `undefined` for absent
- fixtures (2 compared of 2; equal 2): F0133 equal, F0139 equal
- ported cases: none
- written tests: none

## `state.Compartment.get.B3` (Compartment.get)
- hazard: aliasing (Q14)
- fixtures (0 compared of 1; not run 1): F0136 not run
- ported cases: none
- written tests: written_state.rs::compartment_content_of_a_start_state_is_kept_after_a_compartment_effect_that_follows_append_config

## `state.combineConfig.B1` (combineConfig)
- hazard: `===` equality (objects by identity)
- fixtures (26 compared of 26; equal 26): F0140 equal, F0141 equal, F0142 equal, F5126 equal, F5132 equal, F5133 equal, F5134 equal, F5135 equal, ... (18 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.combineConfig.B3` (combineConfig)
- hazard: throw: Error("Config merge conflict for field <key>"); not checkable in advance
- fixtures (33 compared of 41; equal 33, not run 8): F0146 equal, F0147 equal, F0161 equal, F5123 equal, F5124 equal, F5125 not run, F5127 not run, F5128 not run, ... (33 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.combineConfig.B4` (combineConfig)
- hazard: NaN !== NaN
- hazard: null vs undefined distinction
- fixtures (5 compared of 5; equal 5): F0142 equal, F0148 equal, F0149 equal, F0150 equal, F0151 equal
- ported cases: none
- written tests: none

## `state.combineConfig.B5` (combineConfig)
- hazard: `for...in` includes inherited enumerable properties of `defaults`
- fixtures (26 compared of 26; equal 26): F0140 equal, F0152 equal, F0153 equal, F5126 equal, F5132 equal, F5133 equal, F5134 equal, F5135 equal, ... (18 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.combineConfig.B6` (combineConfig)
- hazard: integer-keyed property order
- fixtures (1 compared of 1; equal 1): F0154 equal
- ported cases: none
- written tests: none

## `state.combineConfig.B8` (combineConfig)
- hazard: prototype-inherited keys on `{}` and `Object.hasOwnProperty.call` (Q31)
- fixtures (1 compared of 5; equal 1, not run 4): F0156 equal, F0157 not run, F0187 not run, F0188 not run, F0189 not run
- ported cases: none
- written tests: none

## `state.Facet^define config FacetConfig.compare.B2` (Facet^define config FacetConfig.compare)
- hazard: argument order compare(new, old)
- hazard: identity of kept output
- fixtures (3 compared of 3; equal 3): F0006 equal, F0165 equal, F0166 equal
- ported cases: none
- written tests: none

## `state.Facet^define config FacetConfig.compare.B4` (Facet^define config FacetConfig.compare)
- hazard: compare applied to arrays (Q17)
- fixtures (1 compared of 1; equal 1): F0167 equal
- ported cases: none
- written tests: none

## `state.Facet^define config FacetConfig.compareInput.B1` (Facet^define config FacetConfig.compareInput)
- hazard: argument order (new, old)
- fixtures (3 compared of 3; equal 3): F0050 equal, F0051 equal, F0062 equal
- ported cases: none
- written tests: none

## `state.Facet^define config FacetConfig.static.B2` (Facet^define config FacetConfig.static)
- hazard: `Configuration.staticFacet` reads `staticValues[addr >> 1]` without checking that the address is static (mirrors/cm6/state/src/facet.ts:466); only static facets are passed to it (mirrors/cm6/state/src/state.ts:246, :251)
- fixtures (1 compared of 1; equal 1): F0169 equal
- ported cases: none
- written tests: none

## `state.StateField^define config StateFieldSpec.create.B2` (StateField^define config StateFieldSpec.create)
- hazard: re-entrant access to the partly built state
- fixtures (2 compared of 2; equal 2): F0009 equal, F0176 equal
- ported cases: test-facet#19 (test_cm6_facet_19_applies_effects_from_reconfiguring_transaction_to_new_fields)
- written tests: none

## `state.StateField^define config StateFieldSpec.update.B4` (StateField^define config StateFieldSpec.update)
- hazard: re-entrancy (Q16)
- fixtures (2 compared of 2; equal 2): F0079 equal, F0180 equal
- ported cases: none
- written tests: none

## `state.StateField^define config StateFieldSpec.compare.B2` (StateField^define config StateFieldSpec.compare)
- hazard: argument order (old, new)
- fixtures (2 compared of 2; equal 2): F0069 equal, F0181 equal
- ported cases: none
- written tests: none

## `state.StateField^define config StateFieldSpec.toJSON.B2` (StateField^define config StateFieldSpec.toJSON)
- hazard: engine TypeError instead of a designed error
- fixtures (1 compared of 2; not run 1, part 1): F0184 part, F7168 not run
- ported cases: none
- written tests: none

## `state.Facet.computeN.B7` (Facet.computeN)
- hazard: duck typing: the result is used through the JS iteration protocol and `.length`; nothing checks it is an array
- hazard: engine TypeError text (V8) instead of a designed error
- hazard: the throw happens when the facet is computed, not when the getter returns
- fixtures (0 compared of 9; not run 9): F7100 not run, F7101 not run, F7102 not run, F7103 not run, F7104 not run, F7105 not run, F7106 not run, F7107 not run, ... (1 more in the behavior's row)
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Facet.computeN.B8` (Facet.computeN)
- hazard: duck typing over the iteration protocol and `.length`
- hazard: comparison of `undefined` lengths counts as equal: changes are lost
- hazard: a stored iterator object is consumed by the first spread and reused (stale input)
- fixtures (0 compared of 4; not run 4): F7109 not run, F7110 not run, F7111 not run, F7112 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Facet.computeN.B9` (Facet.computeN)
- hazard: identity: providers are distinct objects deduplicated by identity in flatten (facet.ts:522-531)
- fixtures (1 compared of 1; equal 1): F7113 equal
- ported cases: none
- written tests: none

## `state.Facet.computeN.B10` (Facet.computeN)
- hazard: engine TypeError text (V8)
- hazard: deferred failure: the call that receives the bad value succeeds
- fixtures (0 compared of 2; not run 2): F7114 not run, F7115 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Facet.compute.B12` (Facet.compute)
- hazard: identity: providers are distinct objects deduplicated by identity in flatten (facet.ts:522-531)
- fixtures (1 compared of 1; equal 1): F7116 equal
- ported cases: none
- written tests: none

## `state.Facet.compute.B13` (Facet.compute)
- hazard: engine TypeError text (V8)
- hazard: deferred failure: the call that receives the bad value succeeds
- fixtures (0 compared of 3; not run 3): F7117 not run, F7118 not run, F7119 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Facet.compute.B14` (Facet.compute)
- hazard: duck typing: dependencies are matched by `==` against two strings, then by `dep.id` lookup in the address table
- hazard: silent: an unrecognized dependency never triggers a rerun
- hazard: engine TypeError text (V8)
- fixtures (1 compared of 7; equal 1, not run 6): F7120 not run, F7121 not run, F7122 equal, F7123 not run, F7124 not run, F7125 not run, F7126 not run
- ported cases: none
- written tests: none

## `state.Facet.from.B6` (Facet.from)
- hazard: identity: providers are distinct objects deduplicated by identity in flatten (facet.ts:522-531)
- fixtures (1 compared of 1; equal 1): F7127 equal
- ported cases: none
- written tests: none

## `state.Facet.from.B7` (Facet.from)
- hazard: truthiness test on an optional callback: falsy values mean absent
- hazard: engine TypeError text (V8)
- fixtures (1 compared of 2; equal 1, not run 1): F7128 not run, F7129 equal
- ported cases: none
- written tests: none

## `state.Facet.from.B8` (Facet.from)
- hazard: duck typing: `EditorState.field` reads only `field.id` and the address table shared by fields and facets
- fixtures (0 compared of 2; not run 2): F7130 not run, F7131 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Facet^define.B6` (Facet^define)
- hazard: identity: a facet is identified by its object and module-counter id
- hazard: the default object is shared by every state that lacks the facet
- fixtures (1 compared of 1; equal 1): F7132 equal
- ported cases: none
- written tests: none

## `state.Facet^define config FacetConfig.combine.B5` (Facet^define config FacetConfig.combine)
- hazard: truthiness test on an optional callback
- hazard: engine TypeError text (V8)
- fixtures (1 compared of 4; equal 1, not run 3): F7133 not run, F7134 not run, F7135 not run, F7136 equal
- ported cases: none
- written tests: none

## `state.Facet^define config FacetConfig.compare.B6` (Facet^define config FacetConfig.compare)
- hazard: truthiness of a callback result: a non-boolean is coerced, "false" is truthy
- fixtures (1 compared of 1; equal 1): F7137 equal
- ported cases: none
- written tests: none

## `state.Facet^define config FacetConfig.compare.B7` (Facet^define config FacetConfig.compare)
- hazard: truthiness test on an optional callback
- hazard: engine TypeError text (V8)
- hazard: deferred failure: define and create succeed
- fixtures (1 compared of 4; equal 1, not run 3): F7138 not run, F7139 not run, F7140 not run, F7141 equal
- ported cases: none
- written tests: none

## `state.Facet^define config FacetConfig.compareInput.B4` (Facet^define config FacetConfig.compareInput)
- hazard: truthiness of a callback result: a non-boolean is coerced
- fixtures (1 compared of 1; equal 1): F7142 equal
- ported cases: none
- written tests: none

## `state.Facet^define config FacetConfig.compareInput.B5` (Facet^define config FacetConfig.compareInput)
- hazard: truthiness test on an optional callback
- hazard: engine TypeError text (V8)
- hazard: deferred and data-dependent failure
- fixtures (0 compared of 4; not run 4): F7143 not run, F7144 not run, F7145 not run, F7146 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Facet^define config FacetConfig.enables.B5` (Facet^define config FacetConfig.enables)
- hazard: deferred failure: the error appears only where the facet has a provider
- hazard: truthiness test on the stored value
- fixtures (1 compared of 4; not run 3, part 1): F7147 not run, F7148 not run, F7149 not run, F7150 part
- ported cases: none
- written tests: none

## `state.StateField^define config StateFieldSpec.create.B4` (StateField^define config StateFieldSpec.create)
- hazard: engine TypeError text (V8)
- hazard: deferred failure
- fixtures (0 compared of 3; not run 3): F7151 not run, F7152 not run, F7153 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.StateField^define config StateFieldSpec.update.B6` (StateField^define config StateFieldSpec.update)
- hazard: engine TypeError text (V8)
- hazard: deferred failure: thrown at the first state built by a transaction
- fixtures (0 compared of 2; not run 2): F7154 not run, F7155 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.StateField^define config StateFieldSpec.compare.B3` (StateField^define config StateFieldSpec.compare)
- hazard: truthiness of a callback result: a non-boolean is coerced
- fixtures (1 compared of 1; equal 1): F7156 equal
- ported cases: none
- written tests: none

## `state.StateField^define config StateFieldSpec.compare.B4` (StateField^define config StateFieldSpec.compare)
- hazard: truthiness test on an optional callback
- hazard: engine TypeError text (V8)
- fixtures (1 compared of 2; equal 1, not run 1): F7157 not run, F7158 equal
- ported cases: none
- written tests: none

## `state.StateField^define config StateFieldSpec.provide.B4` (StateField^define config StateFieldSpec.provide)
- hazard: deferred failure for a bad result
- hazard: truthiness test on the stored result
- hazard: engine TypeError text (V8)
- fixtures (0 compared of 5; not run 5): F7159 not run, F7160 not run, F7161 not run, F7162 not run, F7163 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.StateField.init.B6` (StateField.init)
- hazard: two call sites treat a falsy init create differently: `||` fallback at creation, direct call at reconfiguration
- hazard: engine TypeError text (V8)
- fixtures (0 compared of 4; not run 4): F7164 not run, F7165 not run, F7166 not run, F7167 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.StateField^define.B3` (StateField^define)
- hazard: identity: a field is identified by its object and module-counter id
- fixtures (1 compared of 1; equal 1): F7170 equal
- ported cases: none
- written tests: none

## `state.Extension.B9` (Extension)
- hazard: asymmetry: falsy is 'no extensions' only at EditorState.create
- hazard: engine TypeError text (V8) for null/undefined
- fixtures (1 compared of 9; equal 1, not run 8): F7171 equal, F7172 not run, F7173 not run, F7174 not run, F7175 not run, F7176 not run, F7177 not run, F7178 not run, ... (1 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.combineConfig.B11` (combineConfig)
- hazard: identity: a new result object per call; values shared by reference
- fixtures (1 compared of 1; equal 1): F7180 equal
- ported cases: none
- written tests: none

## `state.combineConfig.B12` (combineConfig)
- hazard: engine TypeError text (V8)
- hazard: UTF-16 index keys from Object.keys of a string
- hazard: data-dependent failure: combine is consulted only on a conflict
- fixtures (1 compared of 11; not run 10, part 1): F7181 not run, F7182 not run, F7183 not run, F7184 not run, F7185 not run, F7186 not run, F7187 part, F7188 not run, ... (3 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.Prec.highest.B3` (Prec.highest)
- hazard: identity: a new wrapper per call; the wrapped value is deduplicated by its own identity (facet.ts:522-531)
- fixtures (1 compared of 1; equal 1): F7192 equal
- ported cases: none
- written tests: none

## `state.Prec.high.B2` (Prec.high)
- hazard: identity: a new wrapper per call; the wrapped value is deduplicated by its own identity (facet.ts:522-531)
- fixtures (1 compared of 1; equal 1): F7193 equal
- ported cases: none
- written tests: none

## `state.Prec.default.B3` (Prec.default)
- hazard: identity: a new wrapper per call; the wrapped value is deduplicated by its own identity (facet.ts:522-531)
- fixtures (1 compared of 1; equal 1): F7194 equal
- ported cases: none
- written tests: none

## `state.Prec.low.B2` (Prec.low)
- hazard: identity: a new wrapper per call; the wrapped value is deduplicated by its own identity (facet.ts:522-531)
- fixtures (1 compared of 1; equal 1): F7195 equal
- ported cases: none
- written tests: none

## `state.Prec.lowest.B3` (Prec.lowest)
- hazard: identity: a new wrapper per call; the wrapped value is deduplicated by its own identity (facet.ts:522-531)
- fixtures (1 compared of 1; equal 1): F7196 equal
- ported cases: none
- written tests: none

## `state.Compartment.B6` (Compartment)
- hazard: Map keyed by compartment identity (facet.ts:455, :472)
- fixtures (1 compared of 1; part 1): F7197 part
- ported cases: none
- written tests: none
