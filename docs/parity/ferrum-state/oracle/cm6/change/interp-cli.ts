// Runs one fixture input through interp.ts in its own process, for inputs on which cm6 may not terminate.
// Run only through runIsolated (tools/cm6/oracle-lib.ts), which limits its time (s2-fixtures.ts and s4-tags.ts `fh`).
import {isolatedMain} from "@harness/lib"
import {run} from "./interp"
isolatedMain(arg => run(JSON.parse(arg)))
