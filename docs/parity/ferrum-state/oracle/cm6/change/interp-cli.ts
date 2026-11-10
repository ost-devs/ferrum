// Runs one fixture input through interp.ts in its own process (used by s2-fixtures.ts for inputs that may not terminate).
import {run} from "./interp"
console.log(JSON.stringify(run(JSON.parse(process.argv[2]))))
