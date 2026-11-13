// Shared helper of the change generators (ferrum-state, chunk `change`): they build fixture inputs as JavaScript
// values for interp.ts (its header documents every op) and record, as each output, `run` of the input exactly as the
// fixture file stores it.
import {encode} from "@harness/lib"

/** The input as the fixture file stores it (encoded, then read back as JSON). Run this, and write this. */
export const stored = (input: any): any => JSON.parse(JSON.stringify(encode(input)))
