// Runs one case of s4-fix7-cases.ts (by index) in its own process and prints its output, for inputs on which cm6 may
// not terminate. Run only through runIsolated (tools/cm6/oracle-lib.ts), which limits its time (s4-fix7.ts).
import {isolatedMain} from "@harness/lib"
import {cases, run} from "./s4-fix7-cases"
import {norm} from "./s2-lib"
isolatedMain(arg => norm(run(() => cases[Number(arg)].f(cases[Number(arg)].input))))
