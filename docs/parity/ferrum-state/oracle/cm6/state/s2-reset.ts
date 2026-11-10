// Truncates the chunk fixture file; imported first by s2-run.ts.
import {writeFileSync} from "node:fs"
import {FIX} from "./s2-lib"
writeFileSync(FIX, "")
